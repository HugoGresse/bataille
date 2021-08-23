module.exports = {
    apps: [
        {
            name: 'bataille-server',
            script: 'lib/src/server/server.js',
            watch: 'lib/',
            env: {
                NODE_ENV: 'production',
                SUMOLOGIC_COLLECTOR: 'https://example.com',
            },
        },
    ],
}
