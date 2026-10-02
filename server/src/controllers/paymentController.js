import pool from '../config/db.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { logAuditAction } from '../utils/audit.js';

/**
 * GET /api/payments
 * List payment records. Shops view their own; admin views all.
 */
export const listPayments = async (req, res, next) => {
  try {
    const user = req.user;
    const { shop_id, method, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (user.role === 'shop_owner' || user.role === 'shop_staff') {
      const myShopId = user.shop?.shop_id || user.shop?.id;
      params.push(myShopId);
      conditions.push(`p.shop_id = $${params.length}`);
    } else if (shop_id) {
      params.push(shop_id);
      conditions.push(`p.shop_id = $${params.length}`);
    }

    if (method) {
      params.push(method);
      conditions.push(`p.method = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countRes = await pool.query(`SELECT COUNT(*) FROM payments p JOIN shops s ON p.shop_id = s.id ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const query = `
      SELECT 
        p.*,
        s.shop_name,
        s.city as shop_city,
        o.order_number,
        i.invoice_number,
        u.name as received_by_name
      FROM payments p
      JOIN shops s ON p.shop_id = s.id
      LEFT JOIN orders o ON p.order_id = o.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN users u ON p.received_by = u.id
      ${whereClause}
      ORDER BY p.payment_date DESC, p.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);

    return sendSuccess(res, {
      data: {
        payments: result.rows,
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
 * POST /api/payments
 * Record a payment received from a shop.
 * Transactionally updates shop credit_used, ledger, and order/invoice payment status.
 */
export const recordPayment = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const user = req.user;
    const {
      shop_id, order_id, invoice_id, amount, method = 'bank_transfer',
      transaction_reference, payment_date = new Date().toISOString().slice(0, 10),
      notes,
    } = req.body;

    const parsedAmount = parseFloat(amount);
    if (!shop_id || isNaN(parsedAmount) || parsedAmount <= 0) {
      return sendError(res, { message: 'shop_id and positive amount are required', statusCode: 400 });
    }

    await client.query('BEGIN');

    // 1. Verify shop exists
    const shopRes = await client.query('SELECT * FROM shops WHERE id = $1', [shop_id]);
    if (shopRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, { message: 'Shop not found', statusCode: 404 });
    }
    const shop = shopRes.rows[0];

    // 2. Insert payment record
    const paymentRes = await client.query(
      `INSERT INTO payments (
        shop_id, order_id, invoice_id, amount, method,
        transaction_reference, status, payment_date, received_by, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, 'paid', $7, $8, $9)
      RETURNING *`,
      [
        shop_id, order_id || null, invoice_id || null, parsedAmount,
        method, transaction_reference || null, payment_date, user.id, notes || null
      ]
    );
    const payment = paymentRes.rows[0];

    // 3. Deduct credit_used on shop
    await client.query(
      'UPDATE shops SET credit_used = GREATEST(0, credit_used - $1), updated_at = NOW() WHERE id = $2',
      [parsedAmount, shop_id]
    );

    // 4. Record credit entry in shop_ledger
    await client.query(
      `INSERT INTO shop_ledger (
        shop_id, transaction_type, reference_type, reference_id,
        debit, credit, balance, note, created_by
      ) VALUES ($1, 'PAYMENT', 'payment', $2, 0, $3, 0, $4, $5)`,
      [
        shop_id, payment.id, parsedAmount,
        `Payment received via ${method.toUpperCase()} (${transaction_reference || 'Direct'})`,
        user.id
      ]
    );

    // 5. Update order payment status if linked
    if (order_id) {
      const orderRes = await client.query('SELECT total FROM orders WHERE id = $1', [order_id]);
      if (orderRes.rows.length > 0) {
        const orderTotal = parseFloat(orderRes.rows[0].total);
        const totalPaidRes = await client.query(
          "SELECT COALESCE(SUM(amount), 0) as paid FROM payments WHERE order_id = $1 AND status = 'paid'",
          [order_id]
        );
        const totalPaid = parseFloat(totalPaidRes.rows[0].paid);
        const newStatus = totalPaid >= orderTotal ? 'paid' : (totalPaid > 0 ? 'partially_paid' : 'unpaid');
        await client.query('UPDATE orders SET payment_status = $1, updated_at = NOW() WHERE id = $2', [newStatus, order_id]);
      }
    }

    // 6. Update invoice payment status if linked
    if (invoice_id) {
      const invRes = await client.query('SELECT total FROM invoices WHERE id = $1', [invoice_id]);
      if (invRes.rows.length > 0) {
        const invTotal = parseFloat(invRes.rows[0].total);
        const totalPaidRes = await client.query(
          "SELECT COALESCE(SUM(amount), 0) as paid FROM payments WHERE invoice_id = $1 AND status = 'paid'",
          [invoice_id]
        );
        const totalPaid = parseFloat(totalPaidRes.rows[0].paid);
        const newStatus = totalPaid >= invTotal ? 'paid' : (totalPaid > 0 ? 'partially_paid' : 'issued');
        await client.query('UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2', [newStatus, invoice_id]);
      }
    }

    // 7. Send notification to shop owner
    await client.query(
      `INSERT INTO notifications (recipient_user_id, title, message, type, priority, action_url)
       VALUES ($1, $2, $3, 'payment', 'normal', $4)`,
      [
        shop.owner_user_id,
        'Payment Acknowledged',
        `Payment of ₹${parsedAmount.toLocaleString('en-IN')} received successfully. Your available credit limit has been restored.`,
        '/shop/payments'
      ]
    );

    await client.query('COMMIT');

    await logAuditAction({
      userId: user.id,
      action: 'PAYMENT_RECORDED',
      entityType: 'payment',
      entityId: payment.id,
      newData: { amount: parsedAmount, shop_id, method },
      ipAddress: req.ip,
    });

    return sendCreated(res, { data: { payment }, message: `Payment of ₹${parsedAmount} recorded successfully` });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export default {
  listPayments,
  recordPayment,
};
