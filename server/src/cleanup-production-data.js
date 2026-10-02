/**
 * PURVAJ 2.0 - Production Database Cleanup & Account Normalization
 * 1. Removes all test/fake orders, invoices, payments, deliveries, logs, and notifications
 * 2. Removes fake/test products (e.g. Test Product 1)
 * 3. Keeps EXACTLY 1 Admin account and 2 Shop accounts
 * 4. Resets shop credit balances to clean state
 * 5. Resets inventory reserved stocks
 * 6. Ensures passwords are set to 'Purvaj@2026'
 */

import bcrypt from 'bcryptjs';
import pool from './config/db.js';

const ADMIN_ID = 'a0000001-0000-0000-0000-000000000001'; // Mitansh Soliya (admin@purvaj.com)
const SHOP_1_ID = 'c0000001-0000-0000-0000-000000000001'; // Shree Krishna Traders
const SHOP_1_USER_ID = 'b0000001-0000-0000-0000-000000000001'; // Ramesh Patel (ramesh@sktraders.com)
const SHOP_2_ID = 'c0000001-0000-0000-0000-000000000004'; // Mahadev Traders
const SHOP_2_USER_ID = 'b0000001-0000-0000-0000-000000000004'; // Dinesh Joshi (dinesh@mahadevtraders.com)

const cleanup = async () => {
  console.log('\n========================================================');
  console.log('  PURVAJ 2.0 - DATABASE CLEANUP & RESET TO PRODUCTION  ');
  console.log('========================================================\n');

  const client = await pool.connect();

  try {
    const existingTablesRes = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    const existingTables = new Set(existingTablesRes.rows.map(r => r.table_name));
    console.log('Detected existing tables:', Array.from(existingTables).join(', '));

    const safeDelete = async (table) => {
      if (existingTables.has(table)) {
        await client.query(`DELETE FROM ${table}`);
        console.log(`   Cleared ${table}`);
      }
    };

    await client.query('BEGIN');

    // 1. Delete all transactional fake data
    console.log('1. Clearing fake orders, invoices, payments, and delivery history...');
    await safeDelete('return_items');
    await safeDelete('returns');
    await safeDelete('invoice_items');
    await safeDelete('invoices');
    await safeDelete('payment_transactions');
    await safeDelete('payments');
    await safeDelete('delivery_status_history');
    await safeDelete('delivery_orders');
    await safeDelete('order_status_history');
    await safeDelete('order_items');
    await safeDelete('orders');
    await safeDelete('cart_items');
    await safeDelete('carts');
    await safeDelete('shop_ledger');
    await safeDelete('stock_transactions');
    await safeDelete('notification_preferences');
    await safeDelete('offer_shops');
    await safeDelete('shop_group_members');
    await safeDelete('shop_staff');

    // 2. Clear communications, notifications, broadcasts
    console.log('2. Clearing broadcast logs and notification messages...');
    await safeDelete('broadcast_recipients');
    await safeDelete('broadcasts');
    await safeDelete('message_logs');
    await safeDelete('notifications');
    await safeDelete('audit_logs');

    // 3. Remove fake/test products
    console.log('3. Removing test products...');
    const fakeProds = await client.query(
      "SELECT id, name, sku FROM products WHERE sku = 'TST-001' OR name ILIKE '%test%'"
    );
    for (const p of fakeProds.rows) {
      await client.query('DELETE FROM shop_product_prices WHERE product_id = $1', [p.id]);
      await client.query('DELETE FROM inventory WHERE product_id = $1', [p.id]);
      await client.query('DELETE FROM products WHERE id = $1', [p.id]);
      console.log(`   Removed test product: ${p.name} (${p.sku})`);
    }

    // 4. Clean up shop pricing and shops not in our target 2
    console.log('4. Removing extra shops (keeping 2 active shops)...');
    await client.query(
      'DELETE FROM shop_product_prices WHERE shop_id NOT IN ($1, $2)',
      [SHOP_1_ID, SHOP_2_ID]
    );
    const deletedShops = await client.query(
      'DELETE FROM shops WHERE id NOT IN ($1, $2) RETURNING shop_name',
      [SHOP_1_ID, SHOP_2_ID]
    );
    console.log(`   Removed ${deletedShops.rowCount} extra shops.`);

    // 5. Clean up extra users (keeping 1 Admin and 2 Shop Owners)
    console.log('5. Removing extra users (keeping 1 Admin + 2 Shop Owners)...');
    const deletedUsers = await client.query(
      'DELETE FROM users WHERE id NOT IN ($1, $2, $3) RETURNING name, email',
      [ADMIN_ID, SHOP_1_USER_ID, SHOP_2_USER_ID]
    );
    console.log(`   Removed ${deletedUsers.rowCount} extra users.`);

    // 6. Reset Inventory Reserved Stock to 0
    console.log('6. Resetting inventory reserved stock to 0...');
    await client.query('UPDATE inventory SET reserved_stock = 0');

    // 7. Reset Shop Credit balances
    console.log('7. Resetting shop credit limits and usage to pristine state...');
    await client.query(
      "UPDATE shops SET credit_used = 0, credit_limit = 250000, status = 'active' WHERE id = $1",
      [SHOP_1_ID]
    );
    await client.query(
      "UPDATE shops SET credit_used = 0, credit_limit = 200000, status = 'active' WHERE id = $1",
      [SHOP_2_ID]
    );

    // 8. Update Passwords to 'Purvaj@2026'
    console.log('8. Ensuring secure bcrypt hash for Purvaj@2026 password...');
    const passwordHash = await bcrypt.hash('Purvaj@2026', 10);
    await client.query('UPDATE users SET password_hash = $1', [passwordHash]);

    await client.query('COMMIT');
    console.log('\n✅ DATABASE CLEANUP COMPLETE! ALL FAKE DATA REMOVED.\n');

    // Verify remaining state
    const remainingUsers = await client.query('SELECT id, name, email, role FROM users');
    console.log('=== REMAINING USERS (EXACTLY 1 ADMIN + 2 SHOPS) ===');
    console.table(remainingUsers.rows);

    const remainingShops = await client.query('SELECT id, shop_name, owner_name, mobile, city, credit_limit, credit_used FROM shops');
    console.log('=== REMAINING SHOPS (EXACTLY 2 SHOPS) ===');
    console.table(remainingShops.rows);

    const remainingProducts = await client.query('SELECT COUNT(*) FROM products');
    const remainingOrders = await client.query('SELECT COUNT(*) FROM orders');
    const remainingInvoices = await client.query('SELECT COUNT(*) FROM invoices');
    console.log('=== SUMMARY OF CLEAN DATABASE ===');
    console.log({
      productsCount: remainingProducts.rows[0].count,
      ordersCount: remainingOrders.rows[0].count,
      invoicesCount: remainingInvoices.rows[0].count,
    });

    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cleanup error:', err);
    process.exit(1);
  } finally {
    client.release();
  }
};

cleanup();
