import pool from '../config/db.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { logAuditAction } from '../utils/audit.js';
import { numberToWords } from '../utils/numberToWords.js';

// Business Master Configuration
export const SELLER_DETAILS = {
  business_name: 'PURVAJ WHOLESALE DISTRIBUTORS',
  trade_name: 'Purvaj 2.0 Central Warehouse Operations',
  address: 'Plot No. 42-45, Industrial Wholesale Logistics Park, GIDC Estate',
  city: 'Ahmedabad',
  state: 'Gujarat',
  state_code: '24',
  pincode: '382445',
  gstin: '24AAACP9999P1Z5',
  pan: 'AAACP9999P',
  fssai: '10722000000123',
  phone: '+91 97240 06035',
  email: 'billing@purvaj.com',
  bank: {
    bank_name: 'HDFC Bank Ltd',
    account_name: 'Purvaj Wholesale Distributors',
    account_number: '50200012345678',
    ifsc: 'HDFC0001234',
    branch: 'Ahmedabad Main Central',
    upi_id: 'purvaj.wholesale@hdfcbank',
  },
  terms: [
    'Interest @ 18% p.a. will be charged if payment is not received within the due credit period.',
    'Goods once dispatched & accepted at retail storefront are non-returnable except for transit defect claims within 24 hours.',
    'Subject to Ahmedabad jurisdiction only.',
    'This is a computer-generated tax invoice under Section 31 of CGST Act, 2017.',
  ],
};

/**
 * Unique invoice number generator using DB sequence / atomic counter
 * Format: INV-YYYYMMDD-XXXX
 */
const generateUniqueInvoiceNumber = async (client) => {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');

  // Query highest existing invoice number for today to prevent duplicates
  const res = await client.query(
    `SELECT invoice_number FROM invoices 
     WHERE invoice_number LIKE $1 
     ORDER BY invoice_number DESC LIMIT 1`,
    [`INV-${dateStr}-%`]
  );

  let nextSeq = 1001;
  if (res.rows.length > 0) {
    const lastNum = res.rows[0].invoice_number;
    const parts = lastNum.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }
  }

  return `INV-${dateStr}-${String(nextSeq).padStart(4, '0')}`;
};

/**
 * GET /api/billing/invoices
 * List tax invoices. Shop owners only view their own. Admin views all.
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

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM invoices i JOIN shops s ON i.shop_id = s.id ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const query = `
      SELECT 
        i.*,
        s.shop_name,
        s.gstin as shop_gstin,
        s.city as shop_city,
        s.mobile as shop_mobile,
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
        seller: SELLER_DETAILS,
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
 * Get single invoice with complete line items, tax breakdown, shop info, and seller credentials.
 */
export const getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const invoiceRes = await pool.query(
      `SELECT i.*, 
              s.shop_name, s.owner_name, s.mobile as shop_mobile, s.email as shop_email,
              s.address as shop_address, s.city as shop_city, s.state as shop_state,
              s.pincode as shop_pincode, s.gstin as shop_gstin, s.payment_terms,
              s.credit_limit, s.credit_used,
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

    // Security check: Shop owners only view their own invoices
    if (user.role === 'shop_owner' || user.role === 'shop_staff') {
      const myShopId = user.shop?.shop_id || user.shop?.id;
      if (invoice.shop_id !== myShopId) {
        return sendError(res, { message: 'Access denied', statusCode: 403 });
      }
    }

    // 1. Get items from invoice_items if available, else fallback to order_items
    let items = [];
    const invoiceItemsRes = await pool.query(
      `SELECT ii.*, p.image as product_image 
       FROM invoice_items ii 
       LEFT JOIN products p ON ii.product_id = p.id
       WHERE ii.invoice_id = $1 ORDER BY ii.created_at ASC`,
      [id]
    );

    if (invoiceItemsRes.rows.length > 0) {
      items = invoiceItemsRes.rows;
    } else if (invoice.order_id) {
      const orderItemsRes = await pool.query(
        `SELECT oi.*, p.name as item_name, p.sku, p.hsn_code, p.image as product_image,
                oi.unit_price as rate, oi.tax_rate, oi.tax_amount, oi.total_amount
         FROM order_items oi 
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = $1`,
        [invoice.order_id]
      );
      items = orderItemsRes.rows;
    }

    // 2. Get payments linked to this invoice
    const paymentsRes = await pool.query(
      `SELECT p.*, u.name as received_by_name 
       FROM payments p 
       LEFT JOIN users u ON p.received_by = u.id
       WHERE p.invoice_id = $1 ORDER BY p.payment_date DESC, p.created_at DESC`,
      [id]
    );

    // Calculate dynamic payment totals
    const totalPaid = paymentsRes.rows
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const totalInvoiceAmount = parseFloat(invoice.total);
    const calculatedOutstanding = Math.max(0, +(totalInvoiceAmount - totalPaid).toFixed(2));

    return sendSuccess(res, {
      data: {
        invoice: {
          ...invoice,
          subtotal: parseFloat(invoice.subtotal),
          discount: parseFloat(invoice.discount),
          tax: parseFloat(invoice.tax),
          cgst: parseFloat(invoice.cgst || (invoice.is_interstate ? 0 : invoice.tax / 2)),
          sgst: parseFloat(invoice.sgst || (invoice.is_interstate ? 0 : invoice.tax / 2)),
          igst: parseFloat(invoice.igst || (invoice.is_interstate ? invoice.tax : 0)),
          total: totalInvoiceAmount,
          amount_paid: totalPaid,
          outstanding: calculatedOutstanding,
          items,
          payments: paymentsRes.rows,
        },
        seller: SELLER_DETAILS,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/billing/invoices
 * Admin generates an invoice from an order OR creates a direct invoice.
 * STRICT SECURITY & INTEGRITY:
 * - Server calculates and validates authoritative totals and GST.
 * - Prevents duplicate invoice numbers and duplicate invoices for same order.
 * - Snapshots items into invoice_items permanently.
 * - Updates shop ledger.
 */
export const createInvoice = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { order_id, shop_id, items, discount = 0, due_date, notes } = req.body;

    await client.query('BEGIN');

    let targetShopId = shop_id;
    let targetOrderId = order_id || null;
    let calcSubtotal = 0;
    let calcTotalTax = 0;
    let validatedItems = [];

    // CASE A: Invoice from existing wholesale order
    if (order_id) {
      // 1. DUPLICATE CHECK: Prevent duplicate invoice generation for same order
      const existing = await client.query(
        'SELECT id, invoice_number FROM invoices WHERE order_id = $1',
        [order_id]
      );
      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        return sendError(res, {
          message: `Invoice already generated for this order: ${existing.rows[0].invoice_number}`,
          statusCode: 409,
          code: 'DUPLICATE_INVOICE',
        });
      }

      // Fetch order
      const orderRes = await client.query('SELECT * FROM orders WHERE id = $1', [order_id]);
      if (orderRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return sendError(res, { message: 'Order not found', statusCode: 404 });
      }
      const order = orderRes.rows[0];
      targetShopId = order.shop_id;

      // Fetch order items with product details
      const orderItemsRes = await client.query(
        `SELECT oi.*, p.name as product_name, p.sku, p.hsn_code, p.unit
         FROM order_items oi
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = $1`,
        [order_id]
      );

      orderItemsRes.rows.forEach((oi) => {
        const qty = parseFloat(oi.quantity);
        const rate = parseFloat(oi.unit_price);
        const taxRate = parseFloat(oi.tax_rate || 0);
        const itemSub = +(rate * qty).toFixed(2);
        const itemTax = +((itemSub * taxRate) / 100).toFixed(2);
        const itemTotal = +(itemSub + itemTax).toFixed(2);

        calcSubtotal += itemSub;
        calcTotalTax += itemTax;

        validatedItems.push({
          product_id: oi.product_id,
          item_name: oi.product_name || 'Wholesale Goods',
          sku: oi.sku || '',
          hsn_code: oi.hsn_code || '1905',
          quantity: qty,
          unit: oi.unit || 'pcs',
          rate,
          discount: 0,
          tax_rate: taxRate,
          tax_amount: itemTax,
          total_amount: itemTotal,
        });
      });
    } else if (items && Array.isArray(items) && items.length > 0) {
      // CASE B: Direct invoice created with custom items
      if (!targetShopId) {
        await client.query('ROLLBACK');
        return sendError(res, { message: 'shop_id is required for direct invoice', statusCode: 400 });
      }

      for (const it of items) {
        const qty = parseFloat(it.quantity || 1);
        const rate = parseFloat(it.rate || it.unit_price || 0);
        const taxRate = parseFloat(it.tax_rate || 18);
        const itemDisc = parseFloat(it.discount || 0);

        const itemSub = +(rate * qty - itemDisc).toFixed(2);
        const itemTax = +((itemSub * taxRate) / 100).toFixed(2);
        const itemTotal = +(itemSub + itemTax).toFixed(2);

        calcSubtotal += itemSub;
        calcTotalTax += itemTax;

        validatedItems.push({
          product_id: it.product_id || null,
          item_name: it.item_name || it.name || 'Wholesale Consignment',
          sku: it.sku || '',
          hsn_code: it.hsn_code || '1905',
          quantity: qty,
          unit: it.unit || 'pcs',
          rate,
          discount: itemDisc,
          tax_rate: taxRate,
          tax_amount: itemTax,
          total_amount: itemTotal,
        });
      }
    } else {
      await client.query('ROLLBACK');
      return sendError(res, { message: 'order_id or non-empty items array is required', statusCode: 400 });
    }

    // 2. Fetch Shop to verify status & determine GST Inter-State vs Intra-State
    const shopRes = await client.query('SELECT * FROM shops WHERE id = $1', [targetShopId]);
    if (shopRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, { message: 'Shop not found', statusCode: 404 });
    }
    const shop = shopRes.rows[0];

    // Determine GST jurisdiction:
    // Gujarat state code is 24. If shop's GSTIN starts with 24 or state is Gujarat, it's intra-state.
    const shopState = (shop.state || '').toLowerCase();
    const shopGstin = shop.gstin || '';
    const isGujarat = shopGstin.startsWith('24') || shopState.includes('gujarat') || !shopState;
    const isInterstate = !isGujarat;

    let calcCgst = 0;
    let calcSgst = 0;
    let calcIgst = 0;

    if (isInterstate) {
      calcIgst = +calcTotalTax.toFixed(2);
    } else {
      calcCgst = +(calcTotalTax / 2).toFixed(2);
      calcSgst = +(calcTotalTax / 2).toFixed(2);
    }

    const parsedDiscount = parseFloat(discount || 0);
    const authoritativeGrandTotal = +(calcSubtotal - parsedDiscount + calcTotalTax).toFixed(2);

    // 3. Generate Guaranteed Unique Invoice Number
    const invoiceNumber = await generateUniqueInvoiceNumber(client);

    // Payment due date calculation (Shop payment terms or 15 days default)
    const paymentTermsDays = parseInt(shop.payment_terms, 10) || 15;
    const calcDueDate =
      due_date ||
      new Date(Date.now() + paymentTermsDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // 4. Insert Invoice Record
    const invoiceRes = await client.query(
      `INSERT INTO invoices (
        invoice_number, order_id, shop_id, subtotal, discount,
        tax, cgst, sgst, igst, total, amount_paid, outstanding,
        invoice_date, due_date, status, notes, terms_and_conditions, is_interstate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, $10, CURRENT_DATE, $11, 'issued', $12, $13, $14)
      RETURNING *`,
      [
        invoiceNumber,
        targetOrderId,
        targetShopId,
        calcSubtotal,
        parsedDiscount,
        calcTotalTax,
        calcCgst,
        calcSgst,
        calcIgst,
        authoritativeGrandTotal,
        calcDueDate,
        notes || null,
        SELLER_DETAILS.terms.join('\n'),
        isInterstate,
      ]
    );
    const invoice = invoiceRes.rows[0];

    // 5. Permanently Snapshot Line Items into invoice_items
    for (const item of validatedItems) {
      const itemCgst = isInterstate ? 0 : +(item.tax_amount / 2).toFixed(2);
      const itemSgst = isInterstate ? 0 : +(item.tax_amount / 2).toFixed(2);
      const itemIgst = isInterstate ? item.tax_amount : 0;

      await client.query(
        `INSERT INTO invoice_items (
          invoice_id, product_id, item_name, sku, hsn_code,
          quantity, unit, rate, discount, tax_rate,
          cgst, sgst, igst, tax_amount, total_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          invoice.id,
          item.product_id,
          item.item_name,
          item.sku,
          item.hsn_code,
          item.quantity,
          item.unit,
          item.rate,
          item.discount,
          item.tax_rate,
          itemCgst,
          itemSgst,
          itemIgst,
          item.tax_amount,
          item.total_amount,
        ]
      );
    }

    // 6. Record Double-Entry in shop_ledger
    await client.query(
      `INSERT INTO shop_ledger (
        shop_id, transaction_type, reference_type, reference_id,
        debit, credit, balance, note, created_by
      ) VALUES ($1, 'INVOICE', 'invoice', $2, $3, 0, $3, $4, $5)`,
      [
        targetShopId,
        invoice.id,
        authoritativeGrandTotal,
        `Tax Invoice ${invoice.invoice_number}`,
        req.user?.id || null,
      ]
    );

    await client.query('COMMIT');

    await logAuditAction({
      userId: req.user?.id,
      action: 'INVOICE_GENERATED',
      entityType: 'invoice',
      entityId: invoice.id,
      newData: {
        invoice_number: invoice.invoice_number,
        total: invoice.total,
        shop_id: targetShopId,
      },
      ipAddress: req.ip,
    });

    return sendCreated(res, {
      data: { invoice, items: validatedItems, seller: SELLER_DETAILS },
      message: `Tax Invoice ${invoice.invoice_number} created successfully`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/billing/invoices/:id/status
 * Admin updates invoice lifecycle status (issued, paid, overdue, cancelled).
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

/**
 * GET /api/billing/invoices/:id/print
 * Returns professional standalone HTML ready for A4 browser print / PDF export or 80mm thermal receipt.
 */
export const getPrintableInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { format = 'a4', autoprint = 'false' } = req.query;
    const user = req.user;

    const invoiceRes = await pool.query(
      `SELECT i.*, 
              s.shop_name, s.owner_name, s.mobile as shop_mobile, s.email as shop_email,
              s.address as shop_address, s.city as shop_city, s.state as shop_state,
              s.pincode as shop_pincode, s.gstin as shop_gstin, s.payment_terms,
              s.credit_limit, s.credit_used,
              o.order_number, o.created_at as order_date
       FROM invoices i
       JOIN shops s ON i.shop_id = s.id
       LEFT JOIN orders o ON i.order_id = o.id
       WHERE i.id = $1`,
      [id]
    );

    if (invoiceRes.rows.length === 0) {
      return res.status(404).send('<h2>Invoice not found</h2>');
    }

    const invoice = invoiceRes.rows[0];

    // Security check
    if (user && (user.role === 'shop_owner' || user.role === 'shop_staff')) {
      const myShopId = user.shop?.shop_id || user.shop?.id;
      if (invoice.shop_id !== myShopId) {
        return res.status(403).send('<h2>Access denied</h2>');
      }
    }

    let items = [];
    const invoiceItemsRes = await pool.query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    if (invoiceItemsRes.rows.length > 0) {
      items = invoiceItemsRes.rows;
    } else if (invoice.order_id) {
      const orderItemsRes = await pool.query(
        `SELECT oi.*, p.name as item_name, p.sku, p.hsn_code, p.unit,
                oi.unit_price as rate, oi.tax_rate, oi.tax as tax_amount, oi.total as total_amount
         FROM order_items oi 
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = $1`,
        [invoice.order_id]
      );
      items = orderItemsRes.rows;
    }

    const totalInvoiceAmount = parseFloat(invoice.total || 0);
    const amountPaid = parseFloat(invoice.amount_paid || 0);
    const outstanding = Math.max(0, +(totalInvoiceAmount - amountPaid).toFixed(2));
    const amountInWords = numberToWords(totalInvoiceAmount);
    const isInterstate = !!invoice.is_interstate;

    if (format === 'thermal') {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - ${invoice.invoice_number}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.3;
      margin: 0;
      padding: 10px;
      width: 76mm;
      color: #000;
      background: #fff;
    }
    .no-print {
      position: fixed;
      top: 10px;
      right: 10px;
      background: #2563eb;
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      text-decoration: none;
      font-family: sans-serif;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    @media print {
      .no-print { display: none !important; }
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .item-table { width: 100%; border-collapse: collapse; font-size: 10px; }
    .item-table th { text-align: left; border-bottom: 1px dashed #000; padding: 2px 0; }
    .item-table td { padding: 2px 0; }
    .badge { display: inline-block; padding: 2px 6px; font-weight: bold; border: 1px solid #000; font-size: 9px; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="no-print" onclick="window.print()">Print POS Slip</div>
  <div class="center">
    <div class="bold" style="font-size: 13px;">${SELLER_DETAILS.business_name}</div>
    <div>${SELLER_DETAILS.address}</div>
    <div>Phone: ${SELLER_DETAILS.phone}</div>
    <div class="bold">GSTIN: ${SELLER_DETAILS.gstin}</div>
  </div>
  <div class="divider"></div>
  <div><strong>Invoice #:</strong> ${invoice.invoice_number}</div>
  <div><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString('en-IN')}</div>
  ${invoice.order_number ? `<div><strong>Order #:</strong> ${invoice.order_number}</div>` : ''}
  <div><strong>Shop:</strong> ${invoice.shop_name}</div>
  ${invoice.shop_gstin ? `<div><strong>Shop GSTIN:</strong> ${invoice.shop_gstin}</div>` : ''}
  <div class="divider"></div>
  <table class="item-table">
    <thead>
      <tr>
        <th>Item</th>
        <th class="center">Qty</th>
        <th class="right">Rate</th>
        <th class="right">Amt</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(it => `
        <tr>
          <td colspan="4" class="bold">${it.item_name}</td>
        </tr>
        <tr>
          <td style="font-size: 9px; color: #444;">HSN: ${it.hsn_code || '1905'}</td>
          <td class="center">${it.quantity} ${it.unit || 'pcs'}</td>
          <td class="right">₹${parseFloat(it.rate || it.unit_price).toFixed(2)}</td>
          <td class="right">₹${parseFloat(it.total_amount || it.total).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="divider"></div>
  <table style="width: 100%; font-size: 11px;">
    <tr><td>Subtotal:</td><td class="right">₹${parseFloat(invoice.subtotal).toFixed(2)}</td></tr>
    ${parseFloat(invoice.discount) > 0 ? `<tr><td>Discount:</td><td class="right">-₹${parseFloat(invoice.discount).toFixed(2)}</td></tr>` : ''}
    ${isInterstate ? `
      <tr><td>IGST:</td><td class="right">₹${parseFloat(invoice.igst || invoice.tax).toFixed(2)}</td></tr>
    ` : `
      <tr><td>CGST:</td><td class="right">₹${parseFloat(invoice.cgst || (invoice.tax / 2)).toFixed(2)}</td></tr>
      <tr><td>SGST:</td><td class="right">₹${parseFloat(invoice.sgst || (invoice.tax / 2)).toFixed(2)}</td></tr>
    `}
    <tr class="bold" style="font-size: 13px; border-top: 1px solid #000;">
      <td>GRAND TOTAL:</td>
      <td class="right">₹${totalInvoiceAmount.toFixed(2)}</td>
    </tr>
    <tr><td>Paid:</td><td class="right">₹${amountPaid.toFixed(2)}</td></tr>
    <tr class="bold"><td>Outstanding:</td><td class="right">₹${outstanding.toFixed(2)}</td></tr>
  </table>
  <div class="divider"></div>
  <div class="center" style="font-size: 10px;">
    <div>Payment Status: <span class="badge">${invoice.status.toUpperCase()}</span></div>
    <div style="margin-top: 6px;">Thank you for your business!</div>
    <div style="font-size: 9px; margin-top: 4px;">Purvaj 2.0 Wholesale B2B Platform</div>
  </div>
  ${autoprint === 'true' ? '<script>window.onload = function() { window.print(); };</script>' : ''}
</body>
</html>`;
      return res.setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
    }

    // Default: Professional A4 Tax Invoice layout conforming to GST Act Section 31
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tax Invoice - ${invoice.invoice_number}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    *, *:before, *:after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #1e293b;
      background: #f8fafc;
      margin: 0;
      padding: 20px 0;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 32px 36px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .action-bar {
      max-width: 800px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 18px;
      background: #1e293b;
      color: #ffffff;
      border-radius: 8px;
    }
    .action-btn {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
    }
    .action-btn.secondary {
      background: #475569;
    }
    .action-btn:hover { opacity: 0.9; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .invoice-container {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      .action-bar { display: none !important; }
    }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .brand-title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.5px; }
    .brand-tag { font-size: 10px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; }
    .doc-title { font-size: 18px; font-weight: 800; color: #2563eb; text-align: right; text-transform: uppercase; margin: 0; }
    .meta-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-top: 6px; font-size: 11px; }
    .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .party-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; background: #fafafa; }
    .party-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px; }
    .party-name { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .party-detail { font-size: 11px; color: #334155; line-height: 1.4; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .items-table th {
      background: #0f172a;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 10px;
      text-align: left;
      border: 1px solid #0f172a;
    }
    .items-table th.right { text-align: right; }
    .items-table th.center { text-align: center; }
    .items-table td {
      padding: 8px 10px;
      font-size: 11px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .items-table tr:nth-child(even) td { background: #f8fafc; }
    .totals-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; margin-bottom: 20px; }
    .amount-words-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      background: #f8fafc;
      font-size: 11px;
    }
    .totals-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .totals-table td { padding: 4px 8px; }
    .totals-table tr.grand-total td {
      background: #0f172a;
      color: #ffffff;
      font-weight: 700;
      font-size: 14px;
      padding: 8px;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-paid { background: #dcfce7; color: #15803d; }
    .badge-unpaid { background: #fee2e2; color: #b91c1c; }
    .badge-partial { background: #fef3c7; color: #b45309; }
    .footer-section {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 20px;
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      font-size: 10px;
      color: #475569;
    }
    .terms-box ol { margin: 4px 0 0 0; padding-left: 16px; }
    .terms-box li { margin-bottom: 2px; }
    .sign-box { text-align: center; }
    .stamp-area { height: 50px; }
  </style>
</head>
<body>
  <div class="action-bar">
    <div>
      <strong>Purvaj Wholesale Invoicing System</strong> — Tax Invoice #${invoice.invoice_number}
    </div>
    <div style="display: flex; gap: 8px;">
      <a href="?format=thermal" class="action-btn secondary">Thermal POS Format</a>
      <button onclick="window.print()" class="action-btn">Print / Save as PDF</button>
    </div>
  </div>

  <div class="invoice-container">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="vertical-align: top; width: 60%;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <div style="width: 38px; height: 38px; background: #2563eb; color: #ffffff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 18px;">P</div>
            <div>
              <div class="brand-title">${SELLER_DETAILS.business_name}</div>
              <div class="brand-tag">${SELLER_DETAILS.trade_name}</div>
            </div>
          </div>
          <div style="font-size: 11px; color: #475569; line-height: 1.4;">
            ${SELLER_DETAILS.address}, ${SELLER_DETAILS.city}, ${SELLER_DETAILS.state} - ${SELLER_DETAILS.pincode}<br>
            <strong>GSTIN:</strong> ${SELLER_DETAILS.gstin} | <strong>PAN:</strong> ${SELLER_DETAILS.pan} | <strong>FSSAI:</strong> ${SELLER_DETAILS.fssai}<br>
            <strong>Phone:</strong> ${SELLER_DETAILS.phone} | <strong>Email:</strong> ${SELLER_DETAILS.email}
          </div>
        </td>
        <td style="vertical-align: top; width: 40%; text-align: right;">
          <div class="doc-title">TAX INVOICE</div>
          <div style="font-size: 10px; color: #64748b;">(Under Section 31 of CGST Act, 2017)</div>
          <div class="meta-box" style="text-align: left;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <strong>Invoice No:</strong> <span style="font-family: monospace; font-size: 12px; font-weight: bold;">${invoice.invoice_number}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <strong>Invoice Date:</strong> <span>${new Date(invoice.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <strong>Due Date:</strong> <span>${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Immediate'}</span>
            </div>
            ${invoice.order_number ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <strong>Order Ref:</strong> <span>#${invoice.order_number}</span>
            </div>` : ''}
            <div style="display: flex; justify-content: space-between;">
              <strong>Place of Supply:</strong> <span>${invoice.shop_state || 'Gujarat'} (Code: ${invoice.shop_gstin ? invoice.shop_gstin.slice(0, 2) : '24'})</span>
            </div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Parties Section -->
    <div class="parties-grid">
      <div class="party-card">
        <div class="party-title">Billed By (Supplier)</div>
        <div class="party-name">${SELLER_DETAILS.business_name}</div>
        <div class="party-detail">
          ${SELLER_DETAILS.address}<br>
          ${SELLER_DETAILS.city}, ${SELLER_DETAILS.state} - ${SELLER_DETAILS.pincode}<br>
          <strong>GSTIN:</strong> ${SELLER_DETAILS.gstin}<br>
          <strong>State:</strong> Gujarat (Code: 24)
        </div>
      </div>

      <div class="party-card">
        <div class="party-title">Billed To (Recipient / Retail Storefront)</div>
        <div class="party-name">${invoice.shop_name}</div>
        <div class="party-detail">
          ${invoice.owner_name ? `Prop: <strong>${invoice.owner_name}</strong><br>` : ''}
          ${invoice.shop_address ? `${invoice.shop_address}, ` : ''}${invoice.shop_city || ''} ${invoice.shop_state || 'Gujarat'} ${invoice.shop_pincode ? `- ${invoice.shop_pincode}` : ''}<br>
          <strong>Mobile:</strong> ${invoice.shop_mobile || 'N/A'}<br>
          <strong>GSTIN / UIN:</strong> ${invoice.shop_gstin ? `<span style="font-weight: bold; color: #2563eb;">${invoice.shop_gstin}</span>` : 'Unregistered (Composition / Retail)'}
        </div>
      </div>
    </div>

    <!-- Line Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 25px;" class="center">#</th>
          <th>Item Description</th>
          <th style="width: 70px;">SKU</th>
          <th style="width: 60px;">HSN</th>
          <th style="width: 50px;" class="center">Qty</th>
          <th style="width: 45px;">Unit</th>
          <th style="width: 70px;" class="right">Rate (₹)</th>
          <th style="width: 55px;" class="right">Disc (₹)</th>
          <th style="width: 50px;" class="center">GST %</th>
          <th style="width: 60px;" class="right">Tax (₹)</th>
          <th style="width: 80px;" class="right">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((it, idx) => `
          <tr>
            <td class="center" style="color: #64748b;">${idx + 1}</td>
            <td>
              <strong style="color: #0f172a;">${it.item_name}</strong>
            </td>
            <td style="font-family: monospace; font-size: 10px;">${it.sku || '-'}</td>
            <td style="font-family: monospace; font-size: 10px;">${it.hsn_code || '1905'}</td>
            <td class="center" style="font-weight: 600;">${it.quantity}</td>
            <td>${it.unit || 'pcs'}</td>
            <td class="right">${parseFloat(it.rate || it.unit_price).toFixed(2)}</td>
            <td class="right">${parseFloat(it.discount || 0) > 0 ? parseFloat(it.discount).toFixed(2) : '-'}</td>
            <td class="center">${parseFloat(it.tax_rate || 0)}%</td>
            <td class="right">${parseFloat(it.tax_amount || it.tax || 0).toFixed(2)}</td>
            <td class="right" style="font-weight: 700; color: #0f172a;">${parseFloat(it.total_amount || it.total).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Totals & Amount in Words -->
    <div class="totals-grid">
      <div style="display: flex; flex-direction: column; justify-content: space-between;">
        <div class="amount-words-box">
          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 2px;">Invoice Total (in words):</div>
          <div style="font-weight: 700; color: #0f172a; font-size: 12px;">${amountInWords}</div>
          <div style="margin-top: 10px; display: flex; gap: 8px; align-items: center;">
            <span style="font-size: 10px; color: #64748b;">Payment Status:</span>
            <span class="badge ${invoice.status === 'paid' ? 'badge-paid' : invoice.status === 'partially_paid' ? 'badge-partial' : 'badge-unpaid'}">
              ${invoice.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; background: #fafafa; font-size: 10px; margin-top: 8px;">
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 3px;">Bank Details for NEFT / RTGS / IMPS:</div>
          <div><strong>Bank:</strong> ${SELLER_DETAILS.bank.bank_name} | <strong>A/C:</strong> ${SELLER_DETAILS.bank.account_number}</div>
          <div><strong>IFSC:</strong> ${SELLER_DETAILS.bank.ifsc} | <strong>Branch:</strong> ${SELLER_DETAILS.bank.branch}</div>
          <div><strong>UPI ID:</strong> <span style="font-family: monospace; font-weight: bold; color: #2563eb;">${SELLER_DETAILS.bank.upi_id}</span></div>
        </div>
      </div>

      <div>
        <table class="totals-table">
          <tr>
            <td style="color: #64748b;">Subtotal (Taxable Value):</td>
            <td class="right" style="font-weight: 600;">₹${parseFloat(invoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          ${parseFloat(invoice.discount) > 0 ? `
          <tr>
            <td style="color: #15803d;">Special Trade Discount:</td>
            <td class="right" style="color: #15803d; font-weight: 600;">-₹${parseFloat(invoice.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>` : ''}
          ${isInterstate ? `
          <tr>
            <td style="color: #64748b;">Integrated GST (IGST 100%):</td>
            <td class="right" style="font-weight: 600;">₹${parseFloat(invoice.igst || invoice.tax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>` : `
          <tr>
            <td style="color: #64748b;">Central GST (CGST 50%):</td>
            <td class="right" style="font-weight: 600;">₹${parseFloat(invoice.cgst || (invoice.tax / 2)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">State GST (SGST 50%):</td>
            <td class="right" style="font-weight: 600;">₹${parseFloat(invoice.sgst || (invoice.tax / 2)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>`}
          <tr class="grand-total">
            <td>GRAND TOTAL:</td>
            <td class="right">₹${totalInvoiceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding-top: 6px;">Total Amount Received:</td>
            <td class="right" style="color: #15803d; font-weight: bold; padding-top: 6px;">₹${amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td style="color: #b91c1c; font-weight: bold;">Current Outstanding Balance:</td>
            <td class="right" style="color: #b91c1c; font-weight: bold;">₹${outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Notes & Terms -->
    ${invoice.notes ? `
    <div style="margin-bottom: 12px; font-size: 11px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px;">
      <strong>Invoice Remarks:</strong> ${invoice.notes}
    </div>` : ''}

    <div class="footer-section">
      <div class="terms-box">
        <strong>Terms & Conditions:</strong>
        <ol>
          ${SELLER_DETAILS.terms.map(t => `<li>${t}</li>`).join('')}
        </ol>
      </div>

      <div class="sign-box">
        <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">For ${SELLER_DETAILS.business_name}</div>
        <div class="stamp-area" style="display: flex; align-items: center; justify-content: center; color: #94a3b8; font-style: italic;">
          [ Authorized Signatory & Digital Seal ]
        </div>
        <div style="border-top: 1px solid #cbd5e1; padding-top: 4px; font-size: 9px; color: #64748b;">
          Authorized Signatory / Warehouse Despatch In-Charge
        </div>
      </div>
    </div>
  </div>

  ${autoprint === 'true' ? '<script>window.onload = function() { window.print(); };</script>' : ''}
</body>
</html>`;

    return res.setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
  } catch (err) {
    next(err);
  }
};

export default {
  SELLER_DETAILS,
  listInvoices,
  getInvoiceById,
  getPrintableInvoice,
  createInvoice,
  updateInvoiceStatus,
};
