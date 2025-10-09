module.exports = {
  apps: [{
    name: 'converter-api',
    script: './src/server.js',
    instances: 1,
    exec_mode: 'fork',

    // Memory management
    max_memory_restart: '1800M', // Restart if memory exceeds 1.8GB

    // Logging
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    // Environment variables
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },

    // Auto-restart settings
    watch: false, // Don't watch files in production
    ignore_watch: ['node_modules', 'logs', '.git'],

    // Restart behavior
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',

    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 3000
  }]
};
