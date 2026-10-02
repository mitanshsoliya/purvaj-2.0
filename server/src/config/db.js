import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const isSupabase = connectionString && (connectionString.includes('supabase.co') || connectionString.includes('supabase.com'));
const useSSL = process.env.DATABASE_SSL === 'true' || isSupabase;

/**
 * PostgreSQL / Supabase Compatible Connection Pool
 * Purvaj 2.0 B2B Wholesale Platform
 */
const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: useSSL ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    })
  : new Pool({
      host: process.env.PG_HOST || 'localhost',
      port: parseInt(process.env.PG_PORT || '5432', 10),
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || 'postgres',
      database: process.env.PG_DATABASE || 'purvaj_db',
      ssl: useSSL ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

pool.on('error', (err) => {
  console.error('[PostgreSQL/Supabase Pool Error]:', err.message);
});

// Suppress unhandled error events on individual pooled clients
pool.on('connect', (client) => {
  client.on('error', (err) => {
    console.warn('[PostgreSQL Pooled Client Warning]:', err.message);
  });
});

export const query = (text, params) => pool.query(text, params);
export default pool;
