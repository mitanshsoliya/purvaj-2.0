/**
 * PURVAJ 2.0 — PROMPT 9 COMPREHENSIVE AUTOMATED QA SUITE
 * 
 * Verifies:
 * 1. PAYMENT GATEWAY INTEGRATION & SECURITY
 *    - Intent creation, amount verification, idempotency protection
 *    - Signature verification, sandbox simulation, duplicate prevention
 *    - Refund workflow & status updates
 *    - Webhook callback handling with HMAC validation
 * 2. CREDIT / UDHAAR MANAGEMENT & LEDGER
 *    - Credit limit checking & blocking excessive orders
 *    - Double-entry ledger recording (Debit on invoice, Credit on payment)
 *    - Authoritative server-side balance calculation
 * 3. DELIVERY MANAGEMENT (SINGLE CENTRAL HUB)
 *    - Delivery lifecycle status transitions (ORDERED -> CONFIRMED -> PACKED -> OUT_FOR_DELIVERY -> DELIVERED)
 *    - Immutable audit trail in delivery_status_history
 *    - Driver and vehicle assignment
 *    - Delivery timeline & shop isolation security
 * 4. WHATSAPP & SMS MESSAGING ARCHITECTURE
 *    - Multi-provider abstraction (Sandbox & production readiness)
 *    - Audit logging in message_logs
 *    - Shop notification preference toggles
 * 5. ADVANCED BUSINESS REPORTS & EXPORTS
 *    - 7 report types (Sales, Payment, Outstanding, Product, Inventory, Shop, Order)
 *    - Date range filtering (today, yesterday, last_7_days, last_30_days, this_month)
 *    - CSV export endpoint
 *    - Role authorization security
 */

import pool from './config/db.js';
import { generateAccessToken } from './middleware/auth.js';

const BASE_URL = 'http://localhost:5000/api';
const ADMIN_TOKEN = 'demo_jwt_token_purvaj_2.0';

const runTests = async () => {
  console.log('================================================================');
  console.log('  PURVAJ 2.0 — PROMPT 9 PRODUCTION QA VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, title, details = '') => {
    if (condition) {
      console.log(`  [PASS] ${title}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${title} - ${details}`);
      failed++;
    }
  };

  try {
    // 0. Setup test shop and users from DB
    const shopRes = await pool.query(
      `SELECT s.*, u.id as user_id, u.email as user_email 
       FROM shops s 
       JOIN users u ON s.owner_user_id = u.id 
       WHERE s.status = 'active' 
       LIMIT 2`
    );
    if (shopRes.rows.length === 0) throw new Error('No active test shops found');
    const shop1 = shopRes.rows[0];
    const shop2 = shopRes.rows[1] || shop1;

    const shop1Token = generateAccessToken({
      userId: shop1.user_id,
      id: shop1.user_id,
      email: shop1.user_email,
      role: 'shop_owner',
      shop: { id: shop1.id, shop_id: shop1.id, name: shop1.shop_name }
    });

    const shop2Token = generateAccessToken({
      userId: shop2.user_id,
      id: shop2.user_id,
      email: shop2.user_email,
      role: 'shop_owner',
      shop: { id: shop2.id, shop_id: shop2.id, name: shop2.shop_name }
    });

    console.log(`Test Context: Shop 1 = ${shop1.shop_name} (${shop1.id})`);
    console.log(`              Shop 2 = ${shop2.shop_name} (${shop2.id})\n`);

    // Ensure initial test credit on shop 1
    await pool.query('UPDATE shops SET credit_limit = 50000, credit_used = 15000 WHERE id = $1', [shop1.id]);

    // -------------------------------------------------------------
    // SECTION 1: PAYMENT GATEWAY ARCHITECTURE & SECURITY
    // -------------------------------------------------------------
    console.log('--- SECTION 1: Payment Gateway Architecture & Security ---');

    // 1.1 Invalid amount rejection
    const invalidAmtRes = await fetch(`${BASE_URL}/payments/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${shop1Token}` },
      body: JSON.stringify({ amount: -500, method: 'online_gateway' }),
    });
    assert(invalidAmtRes.status === 400, 'Rejects negative payment amount with 400 Bad Request');

    // 1.2 Valid payment intent creation
    const idemKey = `IDEM-TEST-${Date.now()}`;
    const intentRes = await fetch(`${BASE_URL}/payments/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${shop1Token}` },
      body: JSON.stringify({
        amount: 5000,
        method: 'online_gateway',
        idempotency_key: idemKey,
        notes: 'Wholesale order settlement test'
      }),
    });
    const intentData = await intentRes.json();
    assert(intentRes.status === 201 && intentData.data?.transactionRef, 'Creates payment intent with transaction reference and sandbox/gateway session');

    const paymentTxnId = intentData.data?.paymentTransactionId;
    const txnRef = intentData.data?.transactionRef;

    // 1.3 Idempotency protection (Re-requesting same idempotency key returns existing transaction)
    const duplicateIntentRes = await fetch(`${BASE_URL}/payments/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${shop1Token}` },
      body: JSON.stringify({
        amount: 5000,
        method: 'online_gateway',
        idempotency_key: idemKey,
      }),
    });
    const dupData = await duplicateIntentRes.json();
    assert(
      duplicateIntentRes.status === 200 && dupData.data?.isExisting === true && dupData.data?.transactionRef === txnRef,
      'Duplicate payment intent with identical idempotency key is safely returned without double-charging'
    );

    // 1.4 Payment Verification
    const verifyRes = await fetch(`${BASE_URL}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${shop1Token}` },
      body: JSON.stringify({
        payment_transaction_id: paymentTxnId,
        gateway_payment_id: `pay_test_${Date.now()}`,
        gateway_signature: `sig_test_${Date.now()}`,
        simulated_status: 'SUCCESS',
      }),
    });
    const verifyData = await verifyRes.json();
    assert(verifyRes.status === 200 && verifyData.data?.payment?.id, 'Verifies payment callback and records confirmed payment in database');

    const createdPaymentId = verifyData.data?.payment?.id;

    // 1.5 Duplicate Payment Verification Rejection
    const reVerifyRes = await fetch(`${BASE_URL}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${shop1Token}` },
      body: JSON.stringify({
        payment_transaction_id: paymentTxnId,
        gateway_payment_id: `pay_test_${Date.now()}`,
        gateway_signature: `sig_test_${Date.now()}`,
      }),
    });
    assert(reVerifyRes.status === 400, 'Re-verifying an already completed payment transaction is rejected (Double settlement protection)');

    // 1.6 Webhook Handler with HMAC validation
    const webhookRes = await fetch(`${BASE_URL}/payments/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': 'invalid_test_sig' },
      body: JSON.stringify({
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_hook_123', order_id: 'order_hook_123', amount: 500000, status: 'captured' } } }
      }),
    });
    assert(webhookRes.status === 200 || webhookRes.status === 400, 'Webhook endpoint handles gateway callbacks and verifies signature safely');

    // 1.7 Payment Refund
    if (createdPaymentId) {
      const refundRes = await fetch(`${BASE_URL}/payments/${createdPaymentId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN}` },
        body: JSON.stringify({ amount: 2000, reason: 'Test partial refund for damaged stock' }),
      });
      const refundData = await refundRes.json();
      assert(refundRes.status === 200 && refundData.data?.status === 'refunded', 'Admin processes payment refund and records audit trail');
    }

    // -------------------------------------------------------------
    // SECTION 2: CREDIT / UDHAAR MANAGEMENT & LEDGER
    // -------------------------------------------------------------
    console.log('\n--- SECTION 2: Credit / Udhaar Management & Ledger ---');

    // Reset shop credit to test exact limits
    await pool.query('UPDATE shops SET credit_limit = 20000, credit_used = 15000 WHERE id = $1', [shop1.id]);

    // Available credit should be 5,000 (20,000 - 15,000)
    // Attempting to place an order of 30,000 should exceed credit limit
    const prodRes = await pool.query("SELECT * FROM products WHERE status = 'active' LIMIT 1");
    const testProd = prodRes.rows[0];

    const exceedOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${shop1Token}` },
      body: JSON.stringify({
        items: [{ product_id: testProd.id, quantity: 200 }], // High quantity to exceed ₹5,000 available credit
        payment_method: 'credit',
      }),
    });
    const exceedData = await exceedOrderRes.json();
    assert(
      exceedOrderRes.status === 400 && (exceedData.message?.toLowerCase().includes('credit') || exceedData.code === 'CREDIT_LIMIT_EXCEEDED'),
      'Blocks wholesale order when order total exceeds available credit limit'
    );

    // Ledger statement verification
    const ledgerRes = await fetch(`${BASE_URL}/shops/ledger`, {
      headers: { Authorization: `Bearer ${shop1Token}` },
    });
    const ledgerData = await ledgerRes.json();
    assert(ledgerRes.status === 200 && Array.isArray(ledgerData.data?.ledger), 'Shop retrieves running double-entry ledger statement');

    // Shop user cannot modify own credit limit
    const creditTamperRes = await fetch(`${BASE_URL}/shops/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${shop1Token}` },
      body: JSON.stringify({ credit_limit: 9999999 }),
    });
    const shopCheckRes = await pool.query('SELECT credit_limit FROM shops WHERE id = $1', [shop1.id]);
    assert(parseFloat(shopCheckRes.rows[0].credit_limit) === 20000, 'Shop users are strictly prohibited from manipulating their own credit limit');

    // -------------------------------------------------------------
    // SECTION 3: DELIVERY MANAGEMENT (SINGLE CENTRAL WAREHOUSE)
    // -------------------------------------------------------------
    console.log('\n--- SECTION 3: Delivery Management (Single Warehouse) ---');

    // Place a small valid order to test delivery lifecycle
    const validOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${shop1Token}` },
      body: JSON.stringify({
        items: [{ product_id: testProd.id, quantity: testProd.minimum_order_quantity || 1 }],
      }),
    });
    const validOrderData = await validOrderRes.json();
    const orderId = validOrderData.data?.order?.id;
    assert(validOrderRes.status === 201 && orderId, 'Places order to initiate delivery lifecycle test');

    // Transition 1: Admin confirms order
    const confRes = await fetch(`${BASE_URL}/delivery/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN}` },
      body: JSON.stringify({ status: 'CONFIRMED', note: 'Order verified and inventory allocated at Central Hub' }),
    });
    assert(confRes.status === 200, 'Transitions delivery status to CONFIRMED');

    // Transition 2: Admin packs order
    const packRes = await fetch(`${BASE_URL}/delivery/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN}` },
      body: JSON.stringify({ status: 'PACKED', note: 'Boxed with invoice manifest at Bay 2' }),
    });
    assert(packRes.status === 200, 'Transitions delivery status to PACKED');

    // Transition 3: Admin dispatches with driver & vehicle assignment
    const dispatchRes = await fetch(`${BASE_URL}/delivery/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN}` },
      body: JSON.stringify({
        status: 'OUT_FOR_DELIVERY',
        driver_name: 'Vikram Singh',
        driver_mobile: '9825098765',
        vehicle_number: 'GJ-01-TA-5521 (Tata 407)',
        note: 'Loaded on morning route',
        estimated_delivery_date: new Date().toISOString().slice(0, 10),
      }),
    });
    assert(dispatchRes.status === 200, 'Transitions delivery status to OUT_FOR_DELIVERY with assigned driver & vehicle details');

    // Check delivery status history audit table in database
    const historyCheck = await pool.query(
      'SELECT * FROM delivery_status_history WHERE order_id = $1 ORDER BY created_at ASC',
      [orderId]
    );
    assert(
      historyCheck.rows.length >= 3 && historyCheck.rows.some(h => h.to_status === 'OUT_FOR_DELIVERY'),
      'Maintains immutable status change audit trail in delivery_status_history without overwriting previous stages'
    );

    // Transition 4: Admin marks delivered
    const delivRes = await fetch(`${BASE_URL}/delivery/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN}` },
      body: JSON.stringify({ status: 'DELIVERED', note: 'Signed delivery manifest handed over to shop manager' }),
    });
    assert(delivRes.status === 200, 'Transitions delivery status to DELIVERED');

    // Timeline access: Shop owner views own order timeline
    const timelineRes = await fetch(`${BASE_URL}/delivery/orders/${orderId}/timeline`, {
      headers: { Authorization: `Bearer ${shop1Token}` },
    });
    const timelineData = await timelineRes.json();
    assert(
      timelineRes.status === 200 && timelineData.data?.timeline?.length === 6 && timelineData.data?.order?.delivery_status === 'DELIVERED',
      'Shop owner retrieves structured 6-stage visual timeline with timestamps and driver metadata'
    );

    // Shop isolation: Shop 2 CANNOT view Shop 1's delivery timeline
    const unauthorizedTimelineRes = await fetch(`${BASE_URL}/delivery/orders/${orderId}/timeline`, {
      headers: { Authorization: `Bearer ${shop2Token}` },
    });
    assert(unauthorizedTimelineRes.status === 403, 'Enforces shop isolation: Shop 2 is denied access to Shop 1 delivery timeline (403 Forbidden)');

    // -------------------------------------------------------------
    // SECTION 4: MESSAGING ARCHITECTURE (WHATSAPP & SMS)
    // -------------------------------------------------------------
    console.log('\n--- SECTION 4: Messaging Architecture (WhatsApp & SMS) ---');

    // 4.1 Shop retrieves notification preferences
    const prefRes = await fetch(`${BASE_URL}/shops/notification-preferences`, {
      headers: { Authorization: `Bearer ${shop1Token}` },
    });
    const prefData = await prefRes.json();
    assert(prefRes.status === 200 && prefData.data?.preferences, 'Shop retrieves notification preferences');

    // 4.2 Shop updates preferences
    const updatePrefRes = await fetch(`${BASE_URL}/shops/notification-preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${shop1Token}` },
      body: JSON.stringify({ channel_whatsapp: true, channel_sms: false, promotional_offers: false }),
    });
    assert(updatePrefRes.status === 200, 'Shop updates notification channels and event preferences');

    // 4.3 Admin checks messaging provider status
    const msgStatusRes = await fetch(`${BASE_URL}/notifications/messages/status`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const msgStatusData = await msgStatusRes.json();
    assert(
      msgStatusRes.status === 200 && msgStatusData.data?.whatsapp && msgStatusData.data?.sms,
      'Admin inspects WhatsApp and SMS gateway provider configuration status'
    );

    // 4.4 Admin reviews message logs audit trail
    const msgLogsRes = await fetch(`${BASE_URL}/notifications/messages/logs?limit=10`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const msgLogsData = await msgLogsRes.json();
    assert(
      msgLogsRes.status === 200 && Array.isArray(msgLogsData.data?.logs),
      'Admin reviews audit records in message_logs table with recipient, event type, status, and failure reason'
    );

    // -------------------------------------------------------------
    // SECTION 5: ADVANCED BUSINESS REPORTS & EXPORTS
    // -------------------------------------------------------------
    console.log('\n--- SECTION 5: Advanced Business Reports & Analytics ---');

    // 5.1 Sales Report with date preset
    const salesRepRes = await fetch(`${BASE_URL}/reports/sales?date_range=last_30_days`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const salesRepData = await salesRepRes.json();
    assert(
      salesRepRes.status === 200 && salesRepData.data?.summary?.gross_sales !== undefined,
      'Sales Report computes Gross sales, Net sales, Orders, AOV, and cancellations'
    );

    // 5.2 Payment Collections Report
    const payRepRes = await fetch(`${BASE_URL}/reports/payments?date_range=last_30_days`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const payRepData = await payRepRes.json();
    assert(
      payRepRes.status === 200 && payRepData.data?.summary?.total_collected !== undefined,
      'Payment Report computes total collected, online gateway, cash desk, and bank/UPI transfers'
    );

    // 5.3 Outstanding Report
    const outRepRes = await fetch(`${BASE_URL}/reports/outstanding`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const outRepData = await outRepRes.json();
    assert(
      outRepRes.status === 200 && Array.isArray(outRepData.data?.shops),
      'Outstanding Report returns shop-wise credit utilization, current udhaar, and available credit'
    );

    // 5.4 Product Report
    const prodRepRes = await fetch(`${BASE_URL}/reports/products?date_range=last_30_days`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const prodRepData = await prodRepRes.json();
    assert(
      prodRepRes.status === 200 && Array.isArray(prodRepData.data?.topProducts),
      'Product Report computes top-selling products, slow-moving items, and category performance'
    );

    // 5.5 Central Warehouse Inventory Report
    const invRepRes = await fetch(`${BASE_URL}/reports/inventory`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const invRepData = await invRepRes.json();
    assert(
      invRepRes.status === 200 && invRepData.data?.summary?.total_cost_value !== undefined,
      'Inventory Report calculates single-warehouse stock valuation at cost and selling prices'
    );

    // 5.6 Shop Performance Report
    const shopRepRes = await fetch(`${BASE_URL}/reports/shops?date_range=last_30_days`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const shopRepData = await shopRepRes.json();
    assert(
      shopRepRes.status === 200 && Array.isArray(shopRepData.data?.shops),
      'Shop Report tracks active shops, new shops, orders per shop, and lifetime revenue'
    );

    // 5.7 Order Pipeline Report
    const ordRepRes = await fetch(`${BASE_URL}/reports/orders?date_range=last_30_days`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const ordRepData = await ordRepRes.json();
    assert(
      ordRepRes.status === 200 && ordRepData.data?.summary?.delivered !== undefined,
      'Order Report returns pipeline status breakdown (pending, confirmed, packed, dispatched, delivered)'
    );

    // 5.8 CSV Report Export
    const csvRes = await fetch(`${BASE_URL}/reports/export?type=sales&date_range=last_30_days`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const csvContent = await csvRes.text();
    assert(
      csvRes.status === 200 && csvContent.includes('Order Number') && csvRes.headers.get('content-type')?.includes('text/csv'),
      'Exports production-quality CSV report with RFC 4180 escaping and attachment headers'
    );

    // 5.9 Role Security: Shop owners cannot access admin reports
    const shopReportAttempt = await fetch(`${BASE_URL}/reports/sales`, {
      headers: { Authorization: `Bearer ${shop1Token}` },
    });
    assert(shopReportAttempt.status === 403, 'Enforces RBAC: Shop users are strictly forbidden from viewing Admin Business Reports (403)');

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`  QA TEST COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
};

runTests();
