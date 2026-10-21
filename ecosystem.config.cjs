module.exports = {
  apps: [
    {
      name: 'nhacualand-api',
      script: './scripts/start-api-service.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
