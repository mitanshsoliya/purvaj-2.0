import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Production health check — verifies DB connectivity, memory, uptime
 */
router.get('/health', async (req, res) => {
  const healthData = {
    status: 'ok',
    platform: 'Purvaj 2.0 B2B Wholesale Platform',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    warehouse: {
      name: process.env.WAREHOUSE_NAME || 'Purvaj Main Central Warehouse',
      node: process.env.WAREHOUSE_ID || 'PURVAJ_CENTRAL_01',
      status: 'operational',
      type: 'single-warehouse',
    },
    database: {
      engine: 'PostgreSQL / Supabase Compatible',
      status: 'unknown',
    },
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
    },
  };

  try {
    const dbStart = Date.now();
    const dbResult = await pool.query('SELECT NOW() as current_time');
    const dbLatency = Date.now() - dbStart;

    healthData.database.status = 'connected';
    healthData.database.latency = dbLatency + 'ms';
    healthData.database.serverTime = dbResult.rows[0].current_time;
  } catch (err) {
    healthData.status = 'degraded';
    healthData.database.status = 'error';
    healthData.database.error = process.env.NODE_ENV === 'production' ? 'Connection failed' : err.message;
    return res.status(503).json(healthData);
  }

  res.json(healthData);
});

/**
 * @route   GET /api/health/ready
 * @desc    Readiness probe for load balancers — returns 200 only when fully ready
 */
router.get('/health/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ ready: true });
  } catch {
    res.status(503).json({ ready: false });
  }
});

/**
 * @route   GET /api/health/live
 * @desc    Liveness probe — always returns 200 if process is alive
 */
router.get('/health/live', (req, res) => {
  res.status(200).json({ alive: true, uptime: process.uptime() });
});

export default router;
