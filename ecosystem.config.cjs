/**
 * PURVAJ 2.0 - PM2 Production Process Manager Configuration
 * Usage:
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 reload ecosystem.config.cjs --env production
 *   pm2 logs purvaj-server
 *   pm2 monit
 */

module.exports = {
  apps: [
    {
      name: 'purvaj-api',
      script: 'src/server.js',
      cwd: './server',
      instances: 'max',       // Scales across all available CPU cores
      exec_mode: 'cluster',   // Cluster mode for zero-downtime reloads
      watch: false,           // Never watch files in production
      max_memory_restart: '600M', // Auto-restart if memory exceeds 600MB
      restart_delay: 3000,
      max_restarts: 10,
      kill_timeout: 5000,     // Graceful shutdown period
      listen_timeout: 8000,
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
