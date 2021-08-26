module.exports = {
    apps: [
        {
            name: 'bataille-server',
            script: 'lib/src/server/server.js',
            watch: 'lib/',
            log_date_format: "YYYY-MM-DD HH:mm:ss Z",
            env: {
                NODE_ENV: 'production',
                SUMOLOGIC_COLLECTOR: 'https://example.com',
            },
        },
    ],
}
