import express from 'express';

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'Purvaj 2.0 B2B Wholesale Platform',
    version: '2.0.0',
    warehouse: {
      name: 'Purvaj Main Central Warehouse',
      node: 'PURVAJ_CENTRAL_01',
      status: 'operational',
      type: 'single-warehouse',
    },
    database: {
      engine: 'PostgreSQL / Supabase Compatible',
      status: 'configured',
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
