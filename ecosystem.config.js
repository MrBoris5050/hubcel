module.exports = {
  apps: [
    {
      name: 'hubcel-api',
      cwd: './server',
      script: 'index.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
    },
    {
      name: 'hubcel-client',
      cwd: './client',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: '/api',
      },
    },
  ],
};
