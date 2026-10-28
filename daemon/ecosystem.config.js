module.exports = {
  apps: [
    {
      name: 'meo-dev-daemon',
      script: 'node_modules/.bin/tsx',
      args: 'daemon/index.ts',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};

