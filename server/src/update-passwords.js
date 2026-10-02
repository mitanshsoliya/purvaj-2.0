import bcrypt from 'bcryptjs';
import pool from './config/db.js';

async function updatePasswords() {
  const hash = await bcrypt.hash('Purvaj@2026', 10);
  console.log('Generated hash for Purvaj@2026:', hash);
  const res = await pool.query('UPDATE users SET password_hash = $1', [hash]);
  console.log(`✅ Updated ${res.rowCount} users with valid bcrypt hash for 'Purvaj@2026'`);
  process.exit(0);
}

updatePasswords().catch(err => {
  console.error(err);
  process.exit(1);
});
