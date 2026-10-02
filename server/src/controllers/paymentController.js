import pool from '../config/db.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { logAuditAction } from '../utils/audit.js';
import { SELLER_DETAILS } from './billingController.js';

// Number to Words converter for Indian Rupees
const numberToWords = (num) => {
  if (isNaN(num)) return '';
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = ('000000000' + num.toFixed(0)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += n[1] != 0 ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += n[2] != 0 ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += n[3] != 0 ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += n[4] != 0 ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += n[5] != 0 ? (str != '' ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return str.trim() ? `Rupees ${str.trim()} Only` : 'Zero Rupees';
};

/**
 * GET /api/payments
 * List payment records. Shops view their own; admin views all.
 */
export const listPayments = async (req, res, next) => {
  try {
    const user = req.user;
    const { shop_id, method, page = 1, limit = 50 } = req.query;
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

    if (method && method !== 'all') {
      params.push(method);
      conditions.push(`p.method = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM payments p JOIN shops s ON p.shop_id = s.id ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const query = `
      SELECT 
        p.*,
        s.shop_name,
        s.city as shop_city,
        s.mobile as shop_mobile,
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
 * GET /api/payments/:id/receipt
 * Generate complete printable payment receipt.
 */
export const getPaymentReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const paymentRes = await pool.query(
      `SELECT p.*,
              s.shop_name, s.owner_name, s.mobile as shop_mobile, s.email as shop_email,
              s.address as shop_address, s.city as shop_city, s.gstin as shop_gstin,
              s.credit_limit, s.credit_used,
              o.order_number,
              i.invoice_number, i.total as invoice_total, i.outstanding as invoice_outstanding,
              u.name as received_by_name
       FROM payments p
       JOIN shops s ON p.shop_id = s.id
       LEFT JOIN orders o ON p.order_id = o.id
       LEFT JOIN invoices i ON p.invoice_id = i.id
       LEFT JOIN users u ON p.received_by = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (paymentRes.rows.length === 0) {
      return sendError(res, { message: 'Payment record not found', statusCode: 404 });
    }

    const payment = paymentRes.rows[0];

    // Security check
    if (user.role === 'shop_owner' || user.role === 'shop_staff') {
      const myShopId = user.shop?.shop_id || user.shop?.id;
      if (payment.shop_id !== myShopId) {
        return sendError(res, { message: 'Access denied', statusCode: 403 });
      }
    }

    const amountNum = parseFloat(payment.amount);
    const amountWords = numberToWords(amountNum);

    const receiptNumber = `RCPT-${new Date(payment.payment_date || payment.created_at)
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '')}-${payment.id.slice(0, 6).toUpperCase()}`;

    return sendSuccess(res, {
      data: {
        receipt: {
          ...payment,
          receipt_number: receiptNumber,
          amount_formatted: amountNum.toFixed(2),
          amount_words: amountWords,
          remaining_outstanding: parseFloat(payment.credit_used || 0).toFixed(2),
        },
        seller: SELLER_DETAILS,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/payments
 * Record a payment received from a shop (supports full and partial payments).
 * Transactionally updates shop credit_used, ledger, and order/invoice payment status.
 */
export const recordPayment = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const user = req.user;
    const {
      shop_id,
      order_id,
      invoice_id,
      amount,
      method = 'bank_transfer',
      transaction_reference,
      payment_date = new Date().toISOString().slice(0, 10),
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
        shop_id,
        order_id || null,
        invoice_id || null,
        parsedAmount,
        method,
        transaction_reference || null,
        payment_date,
        user.id,
        notes || null,
      ]
    );
    const payment = paymentRes.rows[0];

    // 3. Deduct credit_used on shop (reduces outstanding udhaar)
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
        shop_id,
        payment.id,
        parsedAmount,
        `Payment received via ${method.toUpperCase()} (${transaction_reference || 'Direct Receipt'})`,
        user.id,
      ]
    );

    // 5. Update invoice payment status & outstanding balance if linked
    if (invoice_id) {
      const invRes = await client.query('SELECT total, amount_paid FROM invoices WHERE id = $1', [invoice_id]);
      if (invRes.rows.length > 0) {
        const invTotal = parseFloat(invRes.rows[0].total);
        const totalPaidRes = await client.query(
          "SELECT COALESCE(SUM(amount), 0) as paid FROM payments WHERE invoice_id = $1 AND status = 'paid'",
          [invoice_id]
        );
        const totalPaid = parseFloat(totalPaidRes.rows[0].paid);
        const remaining = Math.max(0, +(invTotal - totalPaid).toFixed(2));
        const newStatus = remaining <= 0 ? 'paid' : totalPaid > 0 ? 'partially_paid' : 'issued';

        await client.query(
          'UPDATE invoices SET status = $1, amount_paid = $2, outstanding = $3, updated_at = NOW() WHERE id = $4',
          [newStatus, totalPaid, remaining, invoice_id]
        );
      }
    }

    // 6. Update order payment status if linked
    if (order_id) {
      const orderRes = await client.query('SELECT total FROM orders WHERE id = $1', [order_id]);
      if (orderRes.rows.length > 0) {
        const orderTotal = parseFloat(orderRes.rows[0].total);
        const totalPaidRes = await client.query(
          "SELECT COALESCE(SUM(amount), 0) as paid FROM payments WHERE order_id = $1 AND status = 'paid'",
          [order_id]
        );
        const totalPaid = parseFloat(totalPaidRes.rows[0].paid);
        const newStatus = totalPaid >= orderTotal ? 'paid' : totalPaid > 0 ? 'partially_paid' : 'unpaid';
        await client.query('UPDATE orders SET payment_status = $1, updated_at = NOW() WHERE id = $2', [
          newStatus,
          order_id,
        ]);
      }
    }

    // 7. Send notification to shop owner
    await client.query(
      `INSERT INTO notifications (recipient_user_id, title, message, type, priority, action_url)
       VALUES ($1, $2, $3, 'payment', 'normal', $4)`,
      [
        shop.owner_user_id,
        'Payment Receipt Generated',
        `Payment of ₹${parsedAmount.toLocaleString('en-IN')} confirmed via ${method.toUpperCase()}. Credit balance restored.`,
        '/shop/payments',
      ]
    );

    await client.query('COMMIT');

    await logAuditAction({
      userId: user.id,
      action: 'PAYMENT_RECORDED',
      entityType: 'payment',
      entityId: payment.id,
      newData: { amount: parsedAmount, shop_id, method, invoice_id },
      ipAddress: req.ip,
    });

    return sendCreated(res, {
      data: { payment },
      message: `Payment of ₹${parsedAmount} recorded successfully`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * GET /api/payments/:id/print
 * Standalone printable payment receipt voucher (A5 / A4 format)
 */
export const getPrintablePaymentReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { autoprint = 'false' } = req.query;
    const user = req.user;

    const paymentRes = await pool.query(
      `SELECT p.*,
              s.shop_name, s.owner_name, s.mobile as shop_mobile, s.email as shop_email,
              s.address as shop_address, s.city as shop_city, s.gstin as shop_gstin,
              s.credit_limit, s.credit_used,
              o.order_number,
              i.invoice_number, i.total as invoice_total, i.outstanding as invoice_outstanding,
              u.name as received_by_name
       FROM payments p
       JOIN shops s ON p.shop_id = s.id
       LEFT JOIN orders o ON p.order_id = o.id
       LEFT JOIN invoices i ON p.invoice_id = i.id
       LEFT JOIN users u ON p.received_by = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (paymentRes.rows.length === 0) {
      return res.status(404).send('<h2>Payment record not found</h2>');
    }

    const payment = paymentRes.rows[0];

    // Security check
    if (user && (user.role === 'shop_owner' || user.role === 'shop_staff')) {
      const myShopId = user.shop?.shop_id || user.shop?.id;
      if (payment.shop_id !== myShopId) {
        return res.status(403).send('<h2>Access denied</h2>');
      }
    }

    const amountNum = parseFloat(payment.amount);
    const amountWords = numberToWords(amountNum);
    const receiptNumber = `RCPT-${new Date(payment.payment_date || payment.created_at)
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '')}-${payment.id.slice(0, 6).toUpperCase()}`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Receipt - ${receiptNumber}</title>
  <style>
    @page { size: A5 landscape; margin: 10mm 15mm; }
    *, *:before, *:after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #0f172a;
      background: #f1f5f9;
      margin: 0;
      padding: 20px;
    }
    .action-bar {
      max-width: 680px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      background: #0f172a;
      color: #ffffff;
      border-radius: 8px;
    }
    .action-btn {
      background: #16a34a;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .voucher-card {
        border: 2px solid #0f172a !important;
        box-shadow: none !important;
        padding: 20px !important;
        max-width: 100% !important;
      }
      .action-bar { display: none !important; }
    }
    .voucher-card {
      max-width: 680px;
      margin: 0 auto;
      background: #ffffff;
      padding: 28px 32px;
      border: 2px solid #cbd5e1;
      border-radius: 8px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.06);
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .title-box { text-align: right; }
    .voucher-title {
      font-size: 18px;
      font-weight: 900;
      color: #16a34a;
      letter-spacing: 0.5px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
      font-size: 11px;
    }
    .info-box {
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      border-radius: 6px;
      background: #f8fafc;
    }
    .amount-highlight {
      background: #f0fdf4;
      border: 2px solid #86efac;
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .amount-num {
      font-size: 24px;
      font-weight: 900;
      color: #15803d;
    }
    .sign-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px dashed #cbd5e1;
      font-size: 10px;
    }
    .sign-line {
      width: 180px;
      border-top: 1px solid #0f172a;
      text-align: center;
      padding-top: 4px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <div><strong>Official Payment Voucher</strong> — ${receiptNumber}</div>
    <button class="action-btn" onclick="window.print()">Print Payment Receipt</button>
  </div>

  <div class="voucher-card">
    <div class="header-row">
      <div>
        <div style="font-size: 16px; font-weight: 900; color: #0f172a;">${SELLER_DETAILS.business_name}</div>
        <div style="font-size: 10px; color: #475569;">
          ${SELLER_DETAILS.address}, ${SELLER_DETAILS.city}, ${SELLER_DETAILS.state} - ${SELLER_DETAILS.pincode}<br>
          <strong>GSTIN:</strong> ${SELLER_DETAILS.gstin} | <strong>Phone:</strong> ${SELLER_DETAILS.phone}
        </div>
      </div>
      <div class="title-box">
        <div class="voucher-title">OFFICIAL PAYMENT RECEIPT</div>
        <div style="font-size: 10px; font-weight: bold; font-family: monospace;">Receipt No: ${receiptNumber}</div>
        <div style="font-size: 10px; color: #64748b;">Date: ${new Date(payment.payment_date || payment.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-box">
        <div style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b;">Received With Thanks From:</div>
        <div style="font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 2px;">${payment.shop_name}</div>
        <div style="color: #475569; margin-top: 2px;">
          ${payment.owner_name ? `Prop: ${payment.owner_name} | ` : ''}${payment.shop_city || 'Gujarat'}<br>
          GSTIN: ${payment.shop_gstin || 'Unregistered'}
        </div>
      </div>

      <div class="info-box">
        <div style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b;">Payment References:</div>
        <div style="margin-top: 2px;"><strong>Payment Method:</strong> ${(payment.method || 'Bank Transfer').toUpperCase()}</div>
        <div><strong>Transaction Ref / UTR:</strong> <span style="font-family: monospace; font-weight: bold;">${payment.transaction_reference || 'N/A'}</span></div>
        ${payment.invoice_number ? `<div><strong>Adjusted In Tax Invoice:</strong> <span style="font-weight: bold;">${payment.invoice_number}</span></div>` : ''}
        ${payment.order_number ? `<div><strong>Order Ref:</strong> #${payment.order_number}</div>` : ''}
      </div>
    </div>

    <div class="amount-highlight">
      <div>
        <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #166534;">Amount Received (in words):</div>
        <div style="font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 2px;">${amountWords}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #166534;">Amount in Figures:</div>
        <div class="amount-num">₹${amountNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 6px 12px; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 6px;">
      <div>
        <strong>Credit / Udhaar Balance Remaining:</strong>
        <span style="font-weight: bold; color: ${parseFloat(payment.credit_used || 0) > 0 ? '#b91c1c' : '#15803d'};">
          ₹${parseFloat(payment.credit_used || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div>
        <strong>Received By:</strong> ${payment.received_by_name || 'Purvaj Accounts Desk'}
      </div>
    </div>

    ${payment.notes ? `
    <div style="margin-top: 8px; font-size: 10px; color: #475569;">
      <strong>Remarks:</strong> ${payment.notes}
    </div>` : ''}

    <div class="sign-row">
      <div style="color: #64748b; font-size: 9px;">
        * This is an official computer-generated receipt voucher for Purvaj 2.0 Wholesale B2B.
      </div>
      <div class="sign-line">
        Authorized Signatory / Cashier
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
  listPayments,
  getPaymentReceipt,
  getPrintablePaymentReceipt,
  recordPayment,
};
