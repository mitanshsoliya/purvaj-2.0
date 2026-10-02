import pool from '../config/db.js';
import crypto from 'crypto';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { logAuditAction } from '../utils/audit.js';
import { SELLER_DETAILS } from './billingController.js';
import { paymentGatewayService } from '../services/paymentGatewayService.js';
import { messagingService } from '../services/messagingService.js';

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
 * List payment records with filtering and pagination.
 */
export const listPayments = async (req, res, next) => {
  try {
    const user = req.user;
    const { shop_id, method, status, start_date, end_date, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (user.role === 'shop_owner' || user.role === 'shop_staff') {
      const myShopId = user.shop?.shop_id || user.shop?.id;
      params.push(myShopId);
      conditions.push(`p.shop_id = $${params.length}`);
    } else if (shop_id && shop_id !== 'all') {
      params.push(shop_id);
      conditions.push(`p.shop_id = $${params.length}`);
    }

    if (method && method !== 'all') {
      params.push(method);
      conditions.push(`p.method = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    }

    if (start_date) {
      params.push(start_date);
      conditions.push(`p.payment_date >= $${params.length}`);
    }

    if (end_date) {
      params.push(end_date);
      conditions.push(`p.payment_date <= $${params.length}`);
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
 * POST /api/payments/intent
 * Server-authoritative payment intent creation.
 */
export const createPaymentIntent = async (req, res, next) => {
  try {
    const user = req.user;
    const { order_id, invoice_id, amount, payment_method = 'online_gateway', idempotency_key } = req.body;

    let targetShopId = null;
    let verifiedAmount = 0;
    let targetOrderId = order_id || null;
    let targetInvoiceId = invoice_id || null;
    let referenceNotes = {};

    if (user.role === 'shop_owner' || user.role === 'shop_staff') {
      targetShopId = user.shop?.shop_id || user.shop?.id;
    } else if (req.body.shop_id) {
      targetShopId = req.body.shop_id;
    }

    if (!targetShopId) {
      return sendError(res, { message: 'Shop identification is required for payment', statusCode: 400 });
    }

    const shopRes = await pool.query('SELECT * FROM shops WHERE id = $1', [targetShopId]);
    if (shopRes.rows.length === 0) {
      return sendError(res, { message: 'Shop not found', statusCode: 404 });
    }
    const shop = shopRes.rows[0];

    // Server-side authoritative amount verification
    if (invoice_id) {
      const invRes = await pool.query('SELECT * FROM invoices WHERE id = $1', [invoice_id]);
      if (invRes.rows.length === 0) {
        return sendError(res, { message: 'Invoice not found', statusCode: 404 });
      }
      const inv = invRes.rows[0];

      if ((user.role === 'shop_owner' || user.role === 'shop_staff') && inv.shop_id !== targetShopId) {
        return sendError(res, { message: 'Access denied: Cannot pay another shop invoice', statusCode: 403 });
      }

      if (inv.status === 'paid') {
        return sendError(res, { message: 'Invoice is already fully paid', statusCode: 400, code: 'ALREADY_PAID' });
      }

      const invOutstanding = parseFloat(inv.outstanding ?? (inv.total - (inv.amount_paid || 0)));
      if (invOutstanding <= 0) {
        return sendError(res, { message: 'No outstanding balance on this invoice', statusCode: 400 });
      }

      verifiedAmount = amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0
        ? Math.min(parseFloat(amount), invOutstanding)
        : invOutstanding;

      targetOrderId = inv.order_id || targetOrderId;
      referenceNotes = { invoiceNumber: inv.invoice_number, orderId: targetOrderId };
    } else if (order_id) {
      const orderRes = await pool.query('SELECT * FROM orders WHERE id = $1', [order_id]);
      if (orderRes.rows.length === 0) {
        return sendError(res, { message: 'Order not found', statusCode: 404 });
      }
      const ord = orderRes.rows[0];

      if ((user.role === 'shop_owner' || user.role === 'shop_staff') && ord.shop_id !== targetShopId) {
        return sendError(res, { message: 'Access denied: Cannot pay another shop order', statusCode: 403 });
      }

      if (ord.payment_status === 'paid') {
        return sendError(res, { message: 'Order is already fully paid', statusCode: 400, code: 'ALREADY_PAID' });
      }

      const orderTotal = parseFloat(ord.total);
      const paidRes = await pool.query("SELECT COALESCE(SUM(amount), 0) as paid FROM payments WHERE order_id = $1 AND status = 'paid'", [order_id]);
      const alreadyPaid = parseFloat(paidRes.rows[0].paid || 0);
      const orderRemaining = Math.max(0, +(orderTotal - alreadyPaid).toFixed(2));

      if (orderRemaining <= 0) {
        return sendError(res, { message: 'Order balance is already zero', statusCode: 400 });
      }

      verifiedAmount = amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0
        ? Math.min(parseFloat(amount), orderRemaining)
        : orderRemaining;

      referenceNotes = { orderNumber: ord.order_number };
    } else {
      const outstandingUdhaar = parseFloat(shop.credit_used || 0);
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return sendError(res, { message: 'Please enter a valid payment amount', statusCode: 400 });
      }
      if (outstandingUdhaar > 0) {
        verifiedAmount = Math.min(parseFloat(amount), outstandingUdhaar);
        referenceNotes = { type: 'UDHAAR_CREDIT_CLEARANCE' };
      } else {
        verifiedAmount = parseFloat(amount);
        referenceNotes = { type: 'ACCOUNT_ADVANCE_PAYMENT' };
      }
    }

    verifiedAmount = +(verifiedAmount).toFixed(2);
    if (verifiedAmount <= 0) {
      return sendError(res, { message: 'Payable amount must be greater than zero', statusCode: 400 });
    }

    // Idempotency check
    if (idempotency_key) {
      const existingTxn = await pool.query(
        'SELECT * FROM payment_transactions WHERE idempotency_key = $1',
        [idempotency_key]
      );
      if (existingTxn.rows.length > 0) {
        const txn = existingTxn.rows[0];
        if (txn.status === 'INITIATED') {
          return sendSuccess(res, {
            data: {
              paymentTransactionId: txn.id,
              transactionRef: txn.transaction_ref,
              amount: parseFloat(txn.amount),
              currency: txn.currency,
              gatewayOrderId: txn.gateway_order_id,
              gatewayProvider: txn.gateway_provider,
              keyId: paymentGatewayService.keyId,
              isSandbox: paymentGatewayService.isSandbox,
              isExisting: true,
            },
          });
        }
      }
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const transactionRef = `TXN-${dateStr}-${randSuffix}`;

    const gatewayOrder = await paymentGatewayService.createGatewayOrder({
      amount: verifiedAmount,
      currency: 'INR',
      receipt: transactionRef,
      notes: { shopId: targetShopId, shopName: shop.shop_name, ...referenceNotes },
    });

    const txnRes = await pool.query(
      `INSERT INTO payment_transactions (
        transaction_ref, shop_id, order_id, invoice_id, amount,
        currency, method, gateway_provider, gateway_order_id,
        status, idempotency_key, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'INITIATED', $10, $11)
      RETURNING *`,
      [
        transactionRef,
        targetShopId,
        targetOrderId,
        targetInvoiceId,
        verifiedAmount,
        'INR',
        payment_method,
        gatewayOrder.gatewayProvider,
        gatewayOrder.gatewayOrderId,
        idempotency_key || null,
        JSON.stringify(referenceNotes),
      ]
    );

    await logAuditAction({
      userId: user.id,
      action: 'PAYMENT_INTENT_CREATED',
      entityType: 'payment_transaction',
      entityId: txnRes.rows[0].id,
      newData: { transactionRef, amount: verifiedAmount, shopId: targetShopId },
      ipAddress: req.ip,
    });

    return sendCreated(res, {
      data: {
        paymentTransactionId: txnRes.rows[0].id,
        transactionRef,
        amount: verifiedAmount,
        currency: 'INR',
        gatewayOrderId: gatewayOrder.gatewayOrderId,
        gatewayProvider: gatewayOrder.gatewayProvider,
        keyId: paymentGatewayService.keyId,
        isSandbox: paymentGatewayService.isSandbox,
        shopName: shop.shop_name,
      },
      message: 'Payment intent initialized successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/payments/verify
 * Cryptographic payment verification and transactional ledger update.
 */
export const verifyPayment = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const user = req.user;
    const {
      transaction_ref,
      payment_transaction_id,
      transaction_id,
      gateway_order_id,
      gateway_payment_id,
      gateway_signature,
    } = req.body;

    const lookupRef = transaction_ref || null;
    const lookupId = payment_transaction_id || transaction_id || null;

    if (!lookupRef && !lookupId) {
      return sendError(res, { message: 'transaction_ref or payment_transaction_id is required', statusCode: 400 });
    }

    await client.query('BEGIN');

    const txnRes = await client.query(
      `SELECT * FROM payment_transactions 
       WHERE ($1::text IS NOT NULL AND transaction_ref = $1) 
          OR ($2::uuid IS NOT NULL AND id = $2) 
       FOR UPDATE`,
      [lookupRef, lookupId]
    );

    if (txnRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, { message: 'Payment transaction record not found', statusCode: 404 });
    }

    const txn = txnRes.rows[0];

    // Ownership check: Shop owners cannot verify another shop's transaction
    if ((user.role === 'shop_owner' || user.role === 'shop_staff') && user.shop?.id && user.shop.id !== txn.shop_id) {
      await client.query('ROLLBACK');
      return sendError(res, { message: 'Unauthorized: cannot verify payment for another shop', statusCode: 403 });
    }

    // Double settlement protection: Reject if already SUCCESS
    if (txn.status === 'SUCCESS') {
      await client.query('ROLLBACK');
      return sendError(res, {
        message: 'Payment has already been verified and settled. Duplicate settlement is blocked.',
        statusCode: 400,
        code: 'PAYMENT_ALREADY_VERIFIED',
      });
    }

    // Verify signature
    const isValid = paymentGatewayService.verifyPaymentSignature({
      gatewayOrderId: gateway_order_id || txn.gateway_order_id,
      gatewayPaymentId: gateway_payment_id || `pay_${Date.now()}`,
      gatewaySignature: gateway_signature,
    });

    if (!isValid) {
      await client.query(
        "UPDATE payment_transactions SET status = 'FAILED', error_reason = 'Invalid signature verification', updated_at = NOW() WHERE id = $1",
        [txn.id]
      );
      await client.query('COMMIT');
      return sendError(res, {
        message: 'Payment verification failed: Invalid cryptographic signature',
        statusCode: 400,
        code: 'PAYMENT_VERIFICATION_FAILED',
      });
    }

    const paymentId = gateway_payment_id || `pay_sbx_${Date.now()}`;
    await client.query(
      `UPDATE payment_transactions SET
        status = 'SUCCESS',
        gateway_payment_id = $1,
        gateway_signature = $2,
        completed_at = NOW(),
        updated_at = NOW()
       WHERE id = $3`,
      [paymentId, gateway_signature || 'sandbox_sig', txn.id]
    );

    const parsedAmount = parseFloat(txn.amount);

    const paymentRes = await client.query(
      `INSERT INTO payments (
        shop_id, order_id, invoice_id, payment_transaction_id,
        amount, method, transaction_reference, status, payment_date,
        received_by, notes, gateway_metadata
      ) VALUES ($1, $2, $3, $4, $5, 'online_gateway', $6, 'paid', CURRENT_DATE, $7, $8, $9)
      RETURNING *`,
      [
        txn.shop_id,
        txn.order_id,
        txn.invoice_id,
        txn.id,
        parsedAmount,
        txn.transaction_ref,
        user.id,
        `Online payment processed via ${txn.gateway_provider.toUpperCase()} (${paymentId})`,
        JSON.stringify({ gatewayOrderId: gateway_order_id, gatewayPaymentId: paymentId }),
      ]
    );
    const payment = paymentRes.rows[0];

    // Deduct credit_used from shop
    await client.query(
      'UPDATE shops SET credit_used = GREATEST(0, credit_used - $1), updated_at = NOW() WHERE id = $2',
      [parsedAmount, txn.shop_id]
    );

    // Record credit in shop_ledger
    await client.query(
      `INSERT INTO shop_ledger (
        shop_id, transaction_type, reference_type, reference_id,
        debit, credit, balance, note, created_by
      ) VALUES ($1, 'PAYMENT', 'payment', $2, 0, $3, 0, $4, $5)`,
      [txn.shop_id, payment.id, parsedAmount, `Online Settlement ${txn.transaction_ref}`, user.id]
    );

    // Update Invoice if linked
    if (txn.invoice_id) {
      const invRes = await client.query('SELECT total, amount_paid FROM invoices WHERE id = $1', [txn.invoice_id]);
      if (invRes.rows.length > 0) {
        const invTotal = parseFloat(invRes.rows[0].total);
        const totalPaidRes = await client.query(
          "SELECT COALESCE(SUM(amount), 0) as paid FROM payments WHERE invoice_id = $1 AND status = 'paid'",
          [txn.invoice_id]
        );
        const totalPaid = parseFloat(totalPaidRes.rows[0].paid);
        const remaining = Math.max(0, +(invTotal - totalPaid).toFixed(2));
        const newStatus = remaining <= 0 ? 'paid' : 'partially_paid';

        await client.query(
          'UPDATE invoices SET status = $1, amount_paid = $2, outstanding = $3, updated_at = NOW() WHERE id = $4',
          [newStatus, totalPaid, remaining, txn.invoice_id]
        );
      }
    }

    // Update Order if linked
    if (txn.order_id) {
      const orderRes = await client.query('SELECT total FROM orders WHERE id = $1', [txn.order_id]);
      if (orderRes.rows.length > 0) {
        const orderTotal = parseFloat(orderRes.rows[0].total);
        const totalPaidRes = await client.query(
          "SELECT COALESCE(SUM(amount), 0) as paid FROM payments WHERE order_id = $1 AND status = 'paid'",
          [txn.order_id]
        );
        const totalPaid = parseFloat(totalPaidRes.rows[0].paid);
        const newStatus = totalPaid >= orderTotal ? 'paid' : totalPaid > 0 ? 'partially_paid' : 'unpaid';
        await client.query('UPDATE orders SET payment_status = $1, updated_at = NOW() WHERE id = $2', [
          newStatus,
          txn.order_id,
        ]);
      }
    }

    const shopData = await client.query('SELECT * FROM shops WHERE id = $1', [txn.shop_id]);
    const shop = shopData.rows[0];

    // Notification
    await client.query(
      `INSERT INTO notifications (recipient_user_id, title, message, type, priority, action_url)
       VALUES ($1, $2, $3, 'payment', 'normal', $4)`,
      [
        shop?.owner_user_id,
        'Online Payment Successful',
        `Online payment of ₹${parsedAmount.toLocaleString('en-IN')} confirmed (Ref: ${txn.transaction_ref}). Account updated.`,
        '/shop/payments',
      ]
    );

    await client.query('COMMIT');

    // WhatsApp / SMS notification
    messagingService.notifyPaymentConfirmed(payment, shop).catch(() => {});

    await logAuditAction({
      userId: user.id,
      action: 'PAYMENT_GATEWAY_SUCCESS',
      entityType: 'payment',
      entityId: payment.id,
      newData: { transactionRef: transaction_ref, amount: parsedAmount, gatewayPaymentId: paymentId },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      data: {
        payment,
        transactionRef: transaction_ref,
        status: 'SUCCESS',
        amount: parsedAmount,
      },
      message: 'Payment verified and recorded successfully',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * POST /api/payments/webhook
 * Secure gateway webhook receiver.
 */
export const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'] || req.headers['x-webhook-signature'];
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const isValid = paymentGatewayService.verifyWebhookSignature(rawBody, signature);
    if (!isValid && !paymentGatewayService.isSandbox) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body?.event || req.body?.type;
    console.log(`[Webhook Event Received]: ${event}`);

    return res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/payments/:id/refund
 * Admin-authorized partial or full refund.
 */
export const refundPayment = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { amount, reason = 'Administrative Refund' } = req.body;
    const user = req.user;

    await client.query('BEGIN');
    const paymentRes = await client.query('SELECT * FROM payments WHERE id = $1 FOR UPDATE', [id]);
    if (paymentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, { message: 'Payment record not found', statusCode: 404 });
    }

    const payment = paymentRes.rows[0];
    const refundAmount = amount ? Math.min(parseFloat(amount), parseFloat(payment.amount)) : parseFloat(payment.amount);

    await paymentGatewayService.processRefund({
      paymentId: payment.transaction_reference,
      amount: refundAmount,
      reason,
    });

    const newStatus = 'refunded';
    await client.query(
      "UPDATE payments SET status = $1, notes = COALESCE(notes, '') || ' [Refunded: ₹' || $2 || ']' WHERE id = $3",
      [newStatus, refundAmount, id]
    );

    if (payment.payment_transaction_id) {
      await client.query(
        "UPDATE payment_transactions SET status = $1, updated_at = NOW() WHERE id = $2",
        [refundAmount >= parseFloat(payment.amount) ? 'REFUNDED' : 'PARTIALLY_REFUNDED', payment.payment_transaction_id]
      );
    }

    // Restore Udhaar balance if applicable
    await client.query(
      'UPDATE shops SET credit_used = credit_used + $1 WHERE id = $2',
      [refundAmount, payment.shop_id]
    );

    await client.query(
      `INSERT INTO shop_ledger (shop_id, transaction_type, reference_type, reference_id, debit, credit, balance, note, created_by)
       VALUES ($1, 'CREDIT_NOTE', 'payment_refund', $2, $3, 0, 0, $4, $5)`,
      [payment.shop_id, payment.id, refundAmount, `Refund for payment ${payment.transaction_reference}: ${reason}`, user.id]
    );

    await client.query('COMMIT');

    await logAuditAction({
      userId: user.id,
      action: 'PAYMENT_REFUNDED',
      entityType: 'payment',
      entityId: id,
      newData: { refundAmount, reason, newStatus },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { data: { refundAmount, status: newStatus }, message: 'Refund processed successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * GET /api/payments/transactions
 * List payment transaction audit trail with filters.
 */
export const listTransactions = async (req, res, next) => {
  try {
    const user = req.user;
    const { shop_id, status, method, start_date, end_date, min_amount, max_amount, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (user.role === 'shop_owner' || user.role === 'shop_staff') {
      const myShopId = user.shop?.shop_id || user.shop?.id;
      params.push(myShopId);
      conditions.push(`pt.shop_id = $${params.length}`);
    } else if (shop_id && shop_id !== 'all') {
      params.push(shop_id);
      conditions.push(`pt.shop_id = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status.toUpperCase());
      conditions.push(`pt.status = $${params.length}`);
    }

    if (method && method !== 'all') {
      params.push(method);
      conditions.push(`pt.method = $${params.length}`);
    }

    if (start_date) {
      params.push(start_date);
      conditions.push(`pt.created_at >= $${params.length}::timestamptz`);
    }

    if (end_date) {
      params.push(end_date);
      conditions.push(`pt.created_at <= $${params.length}::timestamptz`);
    }

    if (min_amount) {
      params.push(parseFloat(min_amount));
      conditions.push(`pt.amount >= $${params.length}`);
    }

    if (max_amount) {
      params.push(parseFloat(max_amount));
      conditions.push(`pt.amount <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM payment_transactions pt JOIN shops s ON pt.shop_id = s.id ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const query = `
      SELECT 
        pt.*,
        s.shop_name,
        s.city as shop_city,
        s.mobile as shop_mobile,
        o.order_number,
        i.invoice_number
      FROM payment_transactions pt
      JOIN shops s ON pt.shop_id = s.id
      LEFT JOIN orders o ON pt.order_id = o.id
      LEFT JOIN invoices i ON pt.invoice_id = i.id
      ${whereClause}
      ORDER BY pt.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);

    return sendSuccess(res, {
      data: {
        transactions: result.rows,
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
 * GET /api/payments/overview
 * Real-time collection metrics and gateway configuration status.
 */
export const getPaymentOverview = async (req, res, next) => {
  try {
    const user = req.user;
    const { days = 30 } = req.query;

    let shopFilter = '';
    const params = [parseInt(days)];

    if (user.role === 'shop_owner' || user.role === 'shop_staff') {
      const myShopId = user.shop?.shop_id || user.shop?.id;
      params.push(myShopId);
      shopFilter = `AND shop_id = $${params.length}`;
    }

    const summaryQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0)::numeric as total_collected,
        COALESCE(SUM(CASE WHEN status = 'paid' AND payment_date = CURRENT_DATE THEN amount ELSE 0 END), 0)::numeric as today_collected,
        COALESCE(SUM(CASE WHEN status = 'paid' AND method = 'online_gateway' THEN amount ELSE 0 END), 0)::numeric as online_collected,
        COALESCE(SUM(CASE WHEN status = 'paid' AND method = 'cash' THEN amount ELSE 0 END), 0)::numeric as cash_collected,
        COALESCE(SUM(CASE WHEN status = 'paid' AND method IN ('bank_transfer', 'neft', 'rtgs', 'upi') THEN amount ELSE 0 END), 0)::numeric as bank_upi_collected,
        COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0)::numeric as total_refunded
      FROM payments
      WHERE payment_date >= CURRENT_DATE - ($1 || ' days')::INTERVAL
      ${shopFilter}
    `;

    const summaryRes = await pool.query(summaryQuery, params);

    let outstandingQuery = "SELECT COALESCE(SUM(credit_used), 0)::numeric as total_outstanding, COALESCE(SUM(credit_limit), 0)::numeric as total_credit_limit FROM shops WHERE status = 'active'";
    if (user.role === 'shop_owner' || user.role === 'shop_staff') {
      outstandingQuery = "SELECT COALESCE(credit_used, 0)::numeric as total_outstanding, COALESCE(credit_limit, 0)::numeric as total_credit_limit FROM shops WHERE id = $1";
    }
    const outParams = (user.role === 'shop_owner' || user.role === 'shop_staff') ? [user.shop?.shop_id || user.shop?.id] : [];
    const outstandingRes = await pool.query(outstandingQuery, outParams);

    return sendSuccess(res, {
      data: {
        summary: summaryRes.rows[0],
        credit: outstandingRes.rows[0],
        gatewayConfig: {
          provider: paymentGatewayService.provider,
          isSandbox: paymentGatewayService.isSandbox,
          keyId: paymentGatewayService.keyId,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/payments/reminder/:shopId
 * Admin dispatches payment reminder to shop owner.
 */
export const sendPaymentReminder = async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const shopRes = await pool.query('SELECT * FROM shops WHERE id = $1', [shopId]);
    if (shopRes.rows.length === 0) return sendError(res, { message: 'Shop not found', statusCode: 404 });
    const shop = shopRes.rows[0];

    const outstanding = parseFloat(shop.credit_used || 0);
    if (outstanding <= 0) {
      return sendError(res, { message: 'Shop has no outstanding balance', statusCode: 400 });
    }

    await messagingService.notifyPaymentReminder(shop, outstanding);
    return sendSuccess(res, { message: `Payment reminder dispatched to ${shop.shop_name}` });
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
 * Admin manual payment entry (Cash, Bank, Cheque, UPI).
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

    const shopRes = await client.query('SELECT * FROM shops WHERE id = $1', [shop_id]);
    if (shopRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, { message: 'Shop not found', statusCode: 404 });
    }
    const shop = shopRes.rows[0];

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

    // Deduct credit_used
    await client.query(
      'UPDATE shops SET credit_used = GREATEST(0, credit_used - $1), updated_at = NOW() WHERE id = $2',
      [parsedAmount, shop_id]
    );

    // Ledger entry
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

    // Update invoice if linked
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

    // Update order if linked
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

    // Send in-app notification
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

    messagingService.notifyPaymentConfirmed(payment, shop).catch(() => {});

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
      max-width: 650px;
      margin: 0 auto 12px auto;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .btn {
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-secondary {
      background: #e2e8f0;
      color: #334155;
    }
    .receipt-box {
      max-width: 650px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
      background: #f8fafc;
      padding: 12px;
      border-radius: 6px;
    }
    .amount-box {
      border: 2px dashed #10b981;
      background: #ecfdf5;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .sign-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 30px;
      padding-top: 12px;
    }
    .sign-line {
      border-top: 1px solid #94a3b8;
      width: 180px;
      text-align: center;
      font-size: 10px;
      padding-top: 4px;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .action-bar { display: none; }
      .receipt-box { border: none; box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <button class="btn btn-secondary" onclick="window.close()">Close</button>
    <button class="btn" onclick="window.print()">Print Receipt</button>
  </div>

  <div class="receipt-box">
    <div class="header">
      <div>
        <h2 style="margin: 0; font-size: 18px; color: #0f172a; font-weight: 800;">${SELLER_DETAILS.business_name}</h2>
        <div style="font-size: 11px; color: #64748b;">${SELLER_DETAILS.trade_name}</div>
        <div style="font-size: 10px; color: #64748b;">GSTIN: ${SELLER_DETAILS.gstin} | Phone: ${SELLER_DETAILS.phone}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 14px; font-weight: 800; color: #2563eb;">OFFICIAL PAYMENT RECEIPT</div>
        <div style="font-family: monospace; font-size: 12px; font-weight: 700;">${receiptNumber}</div>
        <div style="font-size: 10px; color: #64748b;">Date: ${new Date(payment.payment_date || payment.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      </div>
    </div>

    <div class="grid">
      <div>
        <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">RECEIVED FROM (RETAILER)</div>
        <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${payment.shop_name}</div>
        <div style="font-size: 11px;">Proprietor: ${payment.owner_name || 'N/A'}</div>
        <div style="font-size: 11px;">GSTIN: ${payment.shop_gstin || 'Unregistered'}</div>
        <div style="font-size: 11px;">${payment.shop_city}, Gujarat</div>
      </div>
      <div>
        <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">PAYMENT SETTLEMENT DETAILS</div>
        <div style="font-size: 11px;"><strong>Payment Mode:</strong> <span style="text-transform: uppercase;">${payment.method}</span></div>
        <div style="font-size: 11px;"><strong>Transaction Ref:</strong> ${payment.transaction_reference || 'CASH'}</div>
        ${payment.invoice_number ? `<div style="font-size: 11px;"><strong>Against Tax Invoice:</strong> ${payment.invoice_number}</div>` : ''}
        ${payment.order_number ? `<div style="font-size: 11px;"><strong>Linked Wholesale Order:</strong> #${payment.order_number}</div>` : ''}
        <div style="font-size: 11px;"><strong>Remaining Udhaar Balance:</strong> ₹${parseFloat(payment.credit_used || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
      </div>
    </div>

    <div class="amount-box">
      <div>
        <div style="font-size: 10px; font-weight: 700; color: #065f46; text-transform: uppercase;">AMOUNT RECEIVED</div>
        <div style="font-size: 11px; font-weight: 600; color: #047857; margin-top: 2px;">${amountWords}</div>
      </div>
      <div style="font-size: 20px; font-weight: 900; color: #065f46;">
        ₹${amountNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b; margin-top: 12px;">
      <div><strong>Status:</strong> <span style="color: #059669; font-weight: 700; text-transform: uppercase;">PAID / VERIFIED</span></div>
      <div><strong>Received By:</strong> ${payment.received_by_name || 'Purvaj Accounts Desk'}</div>
    </div>

    ${payment.notes ? `<div style="margin-top: 8px; font-size: 10px; color: #475569;"><strong>Remarks:</strong> ${payment.notes}</div>` : ''}

    <div class="sign-row">
      <div style="color: #64748b; font-size: 9px;">* This is an official computer-generated receipt voucher for Purvaj 2.0 Wholesale B2B.</div>
      <div class="sign-line">Authorized Signatory / Cashier</div>
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
  createPaymentIntent,
  verifyPayment,
  handleWebhook,
  refundPayment,
  listTransactions,
  getPaymentOverview,
  sendPaymentReminder,
  getPaymentReceipt,
  getPrintablePaymentReceipt,
  recordPayment,
};
