import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log('');
  console.log('==================================================');
  console.log('  PURVAJ 2.0 — DATABASE MIGRATION RUNNER');
  console.log('==================================================');
  console.log('');

  const client = await pool.connect();

  try {
    // 1. Run schema migration
    const schemaPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
    console.log('📋 Reading schema migration file...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    console.log('🔨 Executing schema migration (33 tables, enums, indexes, triggers)...');
    await client.query(schemaSql);
    console.log('✅ Schema migration executed successfully!');
    console.log('');

    // 2. Run seed data
    const seedPath = path.join(__dirname, 'seeds', '002_seed_data.sql');
    console.log('🌱 Reading seed data file...');
    const seedSql = fs.readFileSync(seedPath, 'utf-8');

    console.log('📦 Inserting development seed data...');
    await client.query(seedSql);
    console.log('✅ Seed data inserted successfully!');
    console.log('');

    // 3. Verify tables created
    const tableResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('==================================================');
    console.log(`  📊 TABLES CREATED: ${tableResult.rows.length}`);
    console.log('==================================================');
    tableResult.rows.forEach((row, i) => {
      console.log(`  ${String(i + 1).padStart(2, '0')}. ${row.table_name}`);
    });
    console.log('');

    // 4. Verify record counts for seeded tables
    const countQueries = [
      { table: 'users', label: 'Users (Admin + Shop Owners)' },
      { table: 'shops', label: 'Registered Shops' },
      { table: 'categories', label: 'Product Categories' },
      { table: 'brands', label: 'Brands' },
      { table: 'products', label: 'Wholesale Products' },
      { table: 'inventory', label: 'Inventory Records' },
      { table: 'orders', label: 'Sample Orders' },
      { table: 'order_items', label: 'Order Line Items' },
      { table: 'invoices', label: 'Tax Invoices' },
      { table: 'payments', label: 'Payment Records' },
      { table: 'shop_ledger', label: 'Ledger Entries' },
      { table: 'roles', label: 'System Roles' },
      { table: 'permissions', label: 'Permission Entries' },
      { table: 'notifications', label: 'Notifications' },
      { table: 'offers', label: 'Active Offers' },
    ];

    console.log('==================================================');
    console.log('  📦 SEED DATA VERIFICATION');
    console.log('==================================================');

    for (const { table, label } of countQueries) {
      const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = result.rows[0].count;
      const status = parseInt(count) > 0 ? '✅' : '⚠️';
      console.log(`  ${status} ${label}: ${count} records`);
    }

    console.log('');
    console.log('==================================================');
    console.log('  🎉 DATABASE MIGRATION COMPLETE!');
    console.log('  Single Central Warehouse: PURVAJ_CENTRAL_01');
    console.log('==================================================');
    console.log('');

    process.exit(0);
  } catch (err) {
    console.error('');
    console.error('❌ MIGRATION FAILED:');
    console.error('  Error:', err.message);
    if (err.detail) console.error('  Detail:', err.detail);
    if (err.hint) console.error('  Hint:', err.hint);
    if (err.position) console.error('  Position:', err.position);
    console.error('');
    process.exit(1);
  } finally {
    client.release();
  }
}

runMigrations();
