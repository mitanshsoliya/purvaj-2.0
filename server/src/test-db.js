import pool from './config/db.js';

async function testConnection() {
  console.log('🔄 Connecting to Database...');
  const connStr = process.env.DATABASE_URL || `${process.env.PG_HOST}:${process.env.PG_PORT}/${process.env.PG_DATABASE}`;
  const maskedConn = connStr.replace(/:([^:@]+)@/, ':••••••••@');
  console.log(`📡 Target URL: ${maskedConn}`);

  try {
    const startTime = Date.now();
    const res = await pool.query('SELECT NOW() as current_time, current_database() as db_name, version() as pg_version;');
    const duration = Date.now() - startTime;

    console.log('==================================================');
    console.log('✅ DATABASE CONNECTION SUCCESSFUL!');
    console.log(`⏱️ Response Time: ${duration}ms`);
    console.log(`📂 Database: ${res.rows[0].db_name}`);
    console.log(`🕒 Server Time: ${res.rows[0].current_time}`);
    console.log(`🐘 PostgreSQL Version: ${res.rows[0].pg_version.split(',')[0]}`);
    console.log('==================================================');
    process.exit(0);
  } catch (err) {
    console.error('==================================================');
    console.error('❌ DATABASE CONNECTION FAILED:');
    console.error(err.message);
    console.error('==================================================');
    console.error('💡 TIP: Check if your password is correct in server/.env and if Supabase project is active.');
    process.exit(1);
  }
}

testConnection();
