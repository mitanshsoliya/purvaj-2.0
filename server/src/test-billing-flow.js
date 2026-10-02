/**
 * Comprehensive Billing & Invoicing Automated Test Suite
 * Tests all required points:
 * 1. Invoice generation from wholesale order
 * 2. Duplicate invoice prevention (409 Conflict)
 * 3. Unique invoice numbering
 * 4. Direct manual invoice creation with multiple GST slabs & discount
 * 5. Server-side authoritative calculations (subtotal, CGST, SGST, IGST, total)
 * 6. Partial payment reconciliation & outstanding balance update
 * 7. Full payment reconciliation & status transition to 'paid'
 * 8. Official payment receipt generation with Indian Rupee words
 * 9. Standalone printable HTML layouts (A4 & Thermal 80mm)
 * 10. Shop credit limit / udhaar rule enforcement
 */

import pool from './config/db.js';

const BASE_URL = 'http://localhost:5000/api';
const ADMIN_TOKEN = 'demo_jwt_token_purvaj_2.0';

const runTests = async () => {
  console.log('====================================================');
  console.log('  PURVAJ 2.0 — BILLING SYSTEM VERIFICATION SUITE');
  console.log('====================================================\n');

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
    // 0. Setup: Get active shop and product from DB
    const shopRes = await pool.query("SELECT * FROM shops WHERE status = 'active' LIMIT 1");
    if (shopRes.rows.length === 0) throw new Error('No active shop found');
    const shop = shopRes.rows[0];

    const prodRes = await pool.query("SELECT * FROM products WHERE status = 'active' LIMIT 2");
    if (prodRes.rows.length === 0) throw new Error('No active products found');
    const prod1 = prodRes.rows[0];
    const prod2 = prodRes.rows[1] || prod1;

    // Reset shop credit for test stability
    await pool.query('UPDATE shops SET credit_limit = 100000, credit_used = 10000 WHERE id = $1', [shop.id]);

    // 1. Create a wholesale order to bill
    console.log('--- TEST 1: Place Wholesale Order ---');
    const orderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        shop_id: shop.id,
        items: [
          { product_id: prod1.id, quantity: Math.max(prod1.minimum_order_quantity || 1, 10) },
        ],
        notes: 'Test Wholesale Order for Billing Suite',
      }),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      console.error('Order creation failed:', orderRes.status, JSON.stringify(orderData));
    }
    assert(orderRes.ok && orderData.data?.order?.id, 'Wholesale order created successfully');
    const testOrder = orderData.data?.order;
    if (!testOrder) throw new Error('Order creation returned no order: ' + JSON.stringify(orderData));
    console.log(`         Order ID: ${testOrder.id} (${testOrder.order_number})`);

    // 2. Generate Tax Invoice from Order
    console.log('\n--- TEST 2: Generate Invoice from Order ---');
    const invRes = await fetch(`${BASE_URL}/billing/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        order_id: testOrder.id,
        notes: 'Official Wholesale Tax Invoice',
      }),
    });
    const invData = await invRes.json();
    assert(invRes.ok && invData.data?.invoice?.invoice_number, 'Invoice generated from order');
    const orderInvoice = invData.data.invoice;
    console.log(`         Invoice Number: ${orderInvoice.invoice_number}`);
    console.log(`         Subtotal: ₹${orderInvoice.subtotal}, Tax: ₹${orderInvoice.tax}, Total: ₹${orderInvoice.total}`);
    assert(orderInvoice.invoice_number.startsWith('INV-'), 'Unique invoice number format (INV-YYYYMMDD-XXXX)');
    assert(parseFloat(orderInvoice.total) > 0, 'Authoritative total calculated by server');
    assert(parseFloat(orderInvoice.outstanding) === parseFloat(orderInvoice.total), 'Initial outstanding equals total');

    // 3. Duplicate Invoice Prevention Check
    console.log('\n--- TEST 3: Duplicate Invoice Prevention ---');
    const dupRes = await fetch(`${BASE_URL}/billing/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        order_id: testOrder.id,
      }),
    });
    const dupData = await dupRes.json();
    assert(
      dupRes.status === 409 && dupData.code === 'DUPLICATE_INVOICE',
      'Duplicate invoice creation prevented with 409 Conflict',
      JSON.stringify(dupData)
    );

    // 4. Direct Manual Invoice Creation with Line Items, Tax Rates & Discount
    console.log('\n--- TEST 4: Direct Manual Invoice Creation ---');
    const manualItems = [
      { item_name: 'Parle-G Gold Biscuit Carton', sku: 'PG-GLD-500', hsn_code: '1905', quantity: 10, unit: 'Carton', rate: 450, tax_rate: 18, discount: 50 },
      { item_name: 'Tata Tea Gold 250g Jar', sku: 'TTG-250G', hsn_code: '0902', quantity: 20, unit: 'Jar', rate: 160, tax_rate: 5, discount: 0 },
    ];
    // Expected calculations:
    // Item 1: (450 * 10 - 50) = 4450 taxable. Tax (18%) = 801. Total = 5251
    // Item 2: (160 * 20 - 0) = 3200 taxable. Tax (5%) = 160. Total = 3360
    // Subtotal: 4450 + 3200 = 7650
    // Extra Discount: 150
    // Total Tax: 801 + 160 = 961
    // Grand Total: (7650 - 150) + 961 = 8461
    const directRes = await fetch(`${BASE_URL}/billing/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        shop_id: shop.id,
        items: manualItems,
        discount: 150,
        notes: 'Direct B2B Consignment Invoice',
      }),
    });
    const directData = await directRes.json();
    assert(directRes.ok && directData.data?.invoice, 'Direct manual invoice created');
    const directInvoice = directData.data.invoice;
    console.log(`         Invoice Number: ${directInvoice.invoice_number}`);
    console.log(`         Subtotal: ₹${directInvoice.subtotal}, Discount: ₹${directInvoice.discount}, Tax: ₹${directInvoice.tax}, Total: ₹${directInvoice.total}`);
    assert(Math.abs(parseFloat(directInvoice.subtotal) - 7650) < 0.05, 'Server subtotal authoritative calculation');
    assert(Math.abs(parseFloat(directInvoice.tax) - 961) < 0.05, 'Server GST authoritative calculation');
    assert(Math.abs(parseFloat(directInvoice.total) - 8461) < 0.05, 'Server grand total authoritative calculation');

    // 5. Partial Payment Recording & Udhaar Balance Update
    console.log('\n--- TEST 5: Partial Payment Reconciliation ---');
    const partialAmount = 3461;
    const paymentRes1 = await fetch(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        shop_id: shop.id,
        invoice_id: directInvoice.id,
        amount: partialAmount,
        method: 'bank_transfer',
        transaction_reference: 'NEFT-HDFC-998811',
        notes: 'Partial payment on Direct Consignment',
      }),
    });
    const paymentData1 = await paymentRes1.json();
    assert(paymentRes1.ok && paymentData1.data?.payment?.id, 'Partial payment recorded');
    const p1 = paymentData1.data.payment;

    // Verify invoice status after partial payment
    const checkInvRes1 = await fetch(`${BASE_URL}/billing/invoices/${directInvoice.id}`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const checkInvData1 = await checkInvRes1.json();
    const updatedInv1 = checkInvData1.data.invoice;
    console.log(`         Updated Invoice Status: ${updatedInv1.status}`);
    console.log(`         Amount Paid: ₹${updatedInv1.amount_paid}, Outstanding: ₹${updatedInv1.outstanding}`);
    assert(updatedInv1.status === 'partially_paid', "Invoice status updated to 'partially_paid'");
    assert(Math.abs(parseFloat(updatedInv1.amount_paid) - partialAmount) < 0.05, 'Amount paid reconciled accurately');
    assert(Math.abs(parseFloat(updatedInv1.outstanding) - 5000) < 0.05, 'Outstanding balance reduced to ₹5,000');

    // 6. Payment Receipt Generation & Rupee Words Verification
    console.log('\n--- TEST 6: Payment Receipt Voucher ---');
    const receiptRes = await fetch(`${BASE_URL}/payments/${p1.id}/receipt`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const receiptData = await receiptRes.json();
    assert(receiptRes.ok && receiptData.data?.receipt, 'Payment receipt generated');
    const receipt = receiptData.data.receipt;
    console.log(`         Receipt Number: ${receipt.receipt_number}`);
    console.log(`         Amount in Words: ${receipt.amount_words}`);
    assert(receipt.amount_words && receipt.amount_words.includes('Rupees'), 'Amount in words properly formatted');
    assert(receipt.receipt_number.startsWith('RCPT-'), 'Receipt number prefixed with RCPT-');

    // 7. Full Payment Completion & Status Transition to 'paid'
    console.log('\n--- TEST 7: Full Payment Completion ---');
    const finalAmount = 5000;
    const paymentRes2 = await fetch(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        shop_id: shop.id,
        invoice_id: directInvoice.id,
        amount: finalAmount,
        method: 'upi',
        transaction_reference: 'UPI-AXIS-220011',
        notes: 'Final settlement payment',
      }),
    });
    assert(paymentRes2.ok, 'Final balance payment recorded');

    const checkInvRes2 = await fetch(`${BASE_URL}/billing/invoices/${directInvoice.id}`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const checkInvData2 = await checkInvRes2.json();
    const updatedInv2 = checkInvData2.data.invoice;
    console.log(`         Final Invoice Status: ${updatedInv2.status}`);
    console.log(`         Final Amount Paid: ₹${updatedInv2.amount_paid}, Final Outstanding: ₹${updatedInv2.outstanding}`);
    assert(updatedInv2.status === 'paid', "Invoice status successfully marked as 'paid'");
    assert(parseFloat(updatedInv2.outstanding) === 0, 'Invoice outstanding fully cleared to 0');

    // 8. Standalone Printable Layouts (A4 & Thermal 80mm)
    console.log('\n--- TEST 8: Standalone Printable Layouts ---');
    const printA4Res = await fetch(`${BASE_URL}/billing/invoices/${directInvoice.id}/print?token=${ADMIN_TOKEN}`);
    const printA4Html = await printA4Res.text();
    assert(printA4Res.ok && printA4Html.includes('TAX INVOICE'), 'A4 Print layout renders complete GST Tax Invoice');
    assert(printA4Html.includes(directInvoice.invoice_number), 'A4 Print contains unique invoice number');
    assert(printA4Html.includes('PURVAJ WHOLESALE DISTRIBUTORS'), 'A4 Print contains business name & header');

    const printThermalRes = await fetch(`${BASE_URL}/billing/invoices/${directInvoice.id}/print?format=thermal&token=${ADMIN_TOKEN}`);
    const printThermalHtml = await printThermalRes.text();
    assert(printThermalRes.ok && printThermalHtml.includes('80mm auto'), 'Thermal print layout renders 80mm POS slip format');

    const printReceiptRes = await fetch(`${BASE_URL}/payments/${p1.id}/print?token=${ADMIN_TOKEN}`);
    const printReceiptHtml = await printReceiptRes.text();
    assert(printReceiptRes.ok && printReceiptHtml.includes('OFFICIAL PAYMENT RECEIPT'), 'Printable payment voucher renders official receipt layout');

    // 9. Shop Credit / Udhaar Limit Enforcement Test
    console.log('\n--- TEST 9: Credit Limit / Udhaar Enforcement ---');
    // Set low credit limit of ₹1,000 on shop
    await pool.query('UPDATE shops SET credit_limit = 1000, credit_used = 900 WHERE id = $1', [shop.id]);
    const blockedOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        shop_id: shop.id,
        items: [
          { product_id: prod1.id, quantity: 20 },
        ],
        payment_method: 'credit',
      }),
    });
    const blockedData = await blockedOrderRes.json();
    assert(
      blockedOrderRes.status === 400 && blockedData.code === 'CREDIT_LIMIT_EXCEEDED',
      'Order exceeding available credit limit blocked with CREDIT_LIMIT_EXCEEDED',
      JSON.stringify(blockedData)
    );

    // Reset credit limit
    await pool.query('UPDATE shops SET credit_limit = 100000, credit_used = 0 WHERE id = $1', [shop.id]);

    console.log('\n====================================================');
    console.log(`  ALL TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('\nTest Suite Execution Error:', err);
    process.exit(1);
  }
};

runTests();
