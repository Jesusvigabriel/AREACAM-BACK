module.exports = {
  apps: [{
    name: 'areacam-mediamtx',
    script: '/home/camaras-area54/mediamtx',
    args: '/home/camaras-area54/mediamtx_areacam.yml',
    cwd: '/home/camaras-area54',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/home/camaras-area54/mediamtx-logs/pm2-error.log',
    out_file: '/home/camaras-area54/mediamtx-logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
  }]
};
