module.exports = {
  apps: [
    {
      name: 'polyopt',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/polyopt/PolyOpt',
      instances: 'max',  // Use all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Restart if memory exceeds 500MB
      max_memory_restart: '500M',
      // Logging
      error_file: '/var/www/polyopt/logs/error.log',
      out_file: '/var/www/polyopt/logs/output.log',
      merge_logs: true,
      time: true,
      // Auto-restart on crash
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: 'market-sync',
      script: 'npx',
      args: 'tsx scripts/sync-markets.ts',
      cwd: '/var/www/polyopt/PolyOpt',
      cron_restart: '0 * * * *',  // Run every hour
      autorestart: false,
      watch: false,
      error_file: '/var/www/polyopt/logs/market-sync-error.log',
      out_file: '/var/www/polyopt/logs/market-sync-output.log',
      merge_logs: true,
      time: true,
    }
  ]
};
