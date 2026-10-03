/**
 * PURVAJ 2.0 - Total Data Wipe & Account Normalization
 * Instruction:
 * 1. Remove ALL products (0 products)
 * 2. Remove ALL orders, order items, deliveries, invoices, payments, carts, returns (0 orders, 0 invoices)
 * 3. Remove ALL staff, employees, managers, extra roles (0 staff, 0 employees, 0 managers)
 * 4. Keep EXACTLY 1 Admin (role: 'admin') and 2 Shops (roles: 'shop_owner')
 * 5. Reset shop credit usage to 0.00
 * 6. Set passwords to 'Purvaj@2026'
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
  console.log('   PURVAJ 2.0 - TOTAL DATA WIPE (0 PRODUCTS, 0 ORDERS)   ');
  console.log('   KEEPING EXACTLY 1 ADMIN & 2 SHOPS                     ');
  console.log('========================================================\n');

  const client = await pool.connect();

  try {
    const existingTablesRes = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    const existingTables = new Set(existingTablesRes.rows.map((r) => r.table_name));

    const safeDelete = async (table) => {
      if (existingTables.has(table)) {
        await client.query(`DELETE FROM ${table}`);
        console.log(`   Cleared ${table}`);
      }
    };

    await client.query('BEGIN');

    // 1. Delete all transactional order & billing data
    console.log('1. Clearing all orders, invoices, payments, returns, carts, deliveries...');
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
    await safeDelete('offer_products');
    await safeDelete('offer_shops');
    await safeDelete('offers');
    await safeDelete('shop_group_members');

    // 2. Delete ALL staff, employees, managers, employers
    console.log('2. Removing all staff, employees, and managers...');
    await safeDelete('staff');
    await safeDelete('shop_staff');
    await safeDelete('broadcast_recipients');
    await safeDelete('broadcasts');
    await safeDelete('message_logs');
    await safeDelete('notifications');
    await safeDelete('audit_logs');

    // 3. Delete ALL products, inventory, shop prices
    console.log('3. Removing ALL products and inventory...');
    await safeDelete('shop_product_prices');
    await safeDelete('inventory');
    await safeDelete('products');

    // 4. Clean up shops: keep EXACTLY 2 shops
    console.log('4. Keeping EXACTLY 2 active shops (removing all others)...');
    if (existingTables.has('shops')) {
      const deletedShops = await client.query(
        'DELETE FROM shops WHERE id NOT IN ($1, $2) RETURNING shop_name',
        [SHOP_1_ID, SHOP_2_ID]
      );
      console.log(`   Removed ${deletedShops.rowCount} extra shops.`);

      // Reset credit balance on both shops
      await client.query(
        "UPDATE shops SET credit_used = 0, credit_limit = 250000, status = 'active' WHERE id = $1",
        [SHOP_1_ID]
      );
      await client.query(
        "UPDATE shops SET credit_used = 0, credit_limit = 200000, status = 'active' WHERE id = $1",
        [SHOP_2_ID]
      );
    }

    // 5. Clean up users: keep EXACTLY 1 Admin and 2 Shop Owners (NO super_admin, NO manager, NO employer)
    console.log('5. Keeping EXACTLY 1 Admin + 2 Shop Owners (removing all others)...');
    if (existingTables.has('users')) {
      const deletedUsers = await client.query(
        'DELETE FROM users WHERE id NOT IN ($1, $2, $3) RETURNING name, email',
        [ADMIN_ID, SHOP_1_USER_ID, SHOP_2_USER_ID]
      );
      console.log(`   Removed ${deletedUsers.rowCount} extra users.`);

      // Ensure Admin role is 'admin' (not 'super_admin' or anything else)
      await client.query(
        "UPDATE users SET role = 'admin', is_active = true WHERE id = $1",
        [ADMIN_ID]
      );
      // Ensure both shop owners are 'shop_owner'
      await client.query(
        "UPDATE users SET role = 'shop_owner', is_active = true WHERE id IN ($1, $2)",
        [SHOP_1_USER_ID, SHOP_2_USER_ID]
      );

      // Ensure secure password hash for 'Purvaj@2026'
      const passwordHash = await bcrypt.hash('Purvaj@2026', 10);
      await client.query('UPDATE users SET password_hash = $1', [passwordHash]);
    }

    await client.query('COMMIT');
    console.log('\n✅ DATABASE CLEANUP COMPLETE! ALL PRODUCTS & ORDERS REMOVED.\n');

    // Verification
    const remainingUsers = await client.query('SELECT id, name, email, role FROM users ORDER BY role, name');
    console.log('=== REMAINING USERS (EXACTLY 1 ADMIN + 2 SHOPS) ===');
    console.table(remainingUsers.rows);

    const remainingShops = await client.query('SELECT id, shop_name, owner_name, mobile, city, credit_limit, credit_used, status FROM shops');
    console.log('=== REMAINING SHOPS (EXACTLY 2 SHOPS) ===');
    console.table(remainingShops.rows);

    const remainingStaff = await client.query('SELECT COUNT(*) FROM staff');
    const remainingProducts = await client.query('SELECT COUNT(*) FROM products');
    const remainingOrders = await client.query('SELECT COUNT(*) FROM orders');
    const remainingInvoices = await client.query('SELECT COUNT(*) FROM invoices');

    console.log('=== FINAL DATABASE VERIFICATION ===');
    console.log({
      usersCount: remainingUsers.rows.length,
      shopsCount: remainingShops.rows.length,
      staffCount: remainingStaff.rows[0].count,
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
