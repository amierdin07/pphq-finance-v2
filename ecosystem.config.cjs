module.exports = {
  apps: [
    {
      name: 'pphq-finance',
      script: 'server.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    }
  ]
};
