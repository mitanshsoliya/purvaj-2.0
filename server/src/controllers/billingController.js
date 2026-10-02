import pool from '../config/db.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { logAuditAction } from '../utils/audit.js';

const generateInvoiceNumber = () => {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${dateStr}-${rand}`;
};

/**
 * GET /api/billing/invoices
 * List tax invoices. Shop owners only view their own.
 */
export const listInvoices = async (req, res, next) => {
  try {
    const user = req.user;
    const { status, shop_id, search, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (user.role === 'shop_owner' || user.role === 'shop_staff') {
      const myShopId = user.shop?.shop_id || user.shop?.id;
      params.push(myShopId);
      conditions.push(`i.shop_id = $${params.length}`);
    } else if (shop_id) {
      params.push(shop_id);
      conditions.push(`i.shop_id = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`i.status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(i.invoice_number ILIKE $${params.length} OR s.shop_name ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countRes = await pool.query(`SELECT COUNT(*) FROM invoices i JOIN shops s ON i.shop_id = s.id ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const query = `
      SELECT 
        i.*,
        s.shop_name,
        s.gstin as shop_gstin,
        o.order_number
      FROM invoices i
      JOIN shops s ON i.shop_id = s.id
      LEFT JOIN orders o ON i.order_id = o.id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);

    return sendSuccess(res, {
      data: {
        invoices: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/billing/invoices/:id
 * Get single invoice with item breakdown.
 */
export const getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const invoiceRes = await pool.query(
      `SELECT i.*, 
              s.shop_name, s.owner_name, s.mobile as shop_mobile, s.email as shop_email,
              s.address as shop_address, s.city as shop_city, s.gstin as shop_gstin,
              o.order_number, o.created_at as order_date
       FROM invoices i
       JOIN shops s ON i.shop_id = s.id
       LEFT JOIN orders o ON i.order_id = o.id
       WHERE i.id = $1`,
      [id]
    );

    if (invoiceRes.rows.length === 0) {
      return sendError(res, { message: 'Invoice not found', statusCode: 404 });
    }

    const invoice = invoiceRes.rows[0];

    // Security check
    if (user.role === 'shop_owner' || user.role === 'shop_staff') {
      const myShopId = user.shop?.shop_id || user.shop?.id;
      if (invoice.shop_id !== myShopId) {
        return sendError(res, { message: 'Access denied', statusCode: 403 });
      }
    }

    // Get order items if linked
    let items = [];
    if (invoice.order_id) {
      const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [invoice.order_id]);
      items = itemsRes.rows;
    }

    // Get payments linked to this invoice
    const paymentsRes = await pool.query('SELECT * FROM payments WHERE invoice_id = $1 ORDER BY created_at DESC', [id]);

    return sendSuccess(res, {
      data: {
        invoice: {
          ...invoice,
          items,
          payments: paymentsRes.rows,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/billing/invoices
 * Admin / Billing Clerk generates an invoice from an order.
 */
export const createInvoice = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { order_id, due_date, notes } = req.body;

    if (!order_id) {
      return sendError(res, { message: 'order_id is required', statusCode: 400 });
    }

    await client.query('BEGIN');

    // Fetch order
    const orderRes = await client.query('SELECT * FROM orders WHERE id = $1', [order_id]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, { message: 'Order not found', statusCode: 404 });
    }
    const order = orderRes.rows[0];

    // Check if invoice already exists for this order
    const existing = await client.query('SELECT id, invoice_number FROM invoices WHERE order_id = $1', [order_id]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return sendError(res, { message: `Invoice already generated: ${existing.rows[0].invoice_number}`, statusCode: 409 });
    }

    // Get shop payment terms
    const shopRes = await client.query('SELECT payment_terms FROM shops WHERE id = $1', [order.shop_id]);
    const paymentTermsDays = shopRes.rows[0]?.payment_terms || 15;

    const calcDueDate = due_date || new Date(Date.now() + paymentTermsDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const invoiceNumber = generateInvoiceNumber();

    const invoiceRes = await client.query(
      `INSERT INTO invoices (
        invoice_number, order_id, shop_id, subtotal, discount,
        tax, total, invoice_date, due_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, $8, 'issued')
      RETURNING *`,
      [invoiceNumber, order.id, order.shop_id, order.subtotal, order.discount, order.tax, order.total, calcDueDate]
    );

    const invoice = invoiceRes.rows[0];

    // Create entry in shop_ledger
    await client.query(
      `INSERT INTO shop_ledger (
        shop_id, transaction_type, reference_type, reference_id,
        debit, credit, balance, note, created_by
      ) VALUES ($1, 'INVOICE', 'invoice', $2, $3, 0, $3, $4, $5)`,
      [order.shop_id, invoice.id, invoice.total, `Tax Invoice ${invoice.invoice_number}`, req.user?.id]
    );

    await client.query('COMMIT');

    await logAuditAction({
      userId: req.user?.id,
      action: 'INVOICE_GENERATED',
      entityType: 'invoice',
      entityId: invoice.id,
      newData: { invoice_number: invoice.invoice_number, total: invoice.total },
      ipAddress: req.ip,
    });

    return sendCreated(res, { data: { invoice }, message: `Invoice ${invoice.invoice_number} created` });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/billing/invoices/:id/status
 * Admin updates invoice status.
 */
export const updateInvoiceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const valid = ['draft', 'issued', 'paid', 'partially_paid', 'cancelled', 'overdue'];
    if (!valid.includes(status)) {
      return sendError(res, { message: `Invalid status. Allowed: ${valid.join(', ')}`, statusCode: 400 });
    }

    const result = await pool.query(
      'UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return sendError(res, { message: 'Invoice not found', statusCode: 404 });
    }

    return sendSuccess(res, { data: { invoice: result.rows[0] }, message: 'Invoice status updated' });
  } catch (err) {
    next(err);
  }
};

export default {
  listInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoiceStatus,
};
