module.exports = {
    apps: [
        {
            name: 'reconciliation-server',
            script: './server.js',
            instances: 1,
            exec_mode: 'cluster',
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production'
            },
            error_file: './logs/server-error.log',
            out_file: './logs/server-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            autorestart: true,
            max_restarts: 10,
            restart_delay: 4000
        },
        {
            name: 'reconciliation-worker',
            script: './worker.js',
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            max_memory_restart: '2G',
            env: {
                NODE_ENV: 'production'
            },
            error_file: './logs/worker-error.log',
            out_file: './logs/worker-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            autorestart: true,
            max_restarts: 10,
            restart_delay: 4000
        }
    ]
};
