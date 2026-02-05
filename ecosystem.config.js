module.exports = {
    apps: [{
        name: 'bot-nghi-phep',
        script: 'src/index.js',
        cwd: __dirname,

        // Tự động restart lúc 3:00 AM mỗi ngày (giờ Việt Nam)
        cron_restart: '0 3 * * *',

        // Tự động restart khi crash
        autorestart: true,

        // Số lần restart tối đa trong 15 phút
        max_restarts: 10,
        min_uptime: '10s',

        // Chờ 5 giây trước khi restart
        restart_delay: 5000,

        // Watch mode (tắt cho production)
        watch: false,

        // Bỏ qua các thư mục khi watch
        ignore_watch: ['node_modules', 'data', 'logs', '.git'],

        // Environment variables
        env: {
            NODE_ENV: 'production'
        },

        // Logging
        error_file: 'logs/error.log',
        out_file: 'logs/out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,

        // Memory limit - restart nếu vượt quá 500MB
        max_memory_restart: '500M',

        // Graceful shutdown
        kill_timeout: 5000,
        wait_ready: true,
        listen_timeout: 10000
    }]
};
