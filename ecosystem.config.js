module.exports = {
  apps: [
    {
      name: 'cliff-backend',
      cwd: './backend',
      script: 'uvicorn',
      args: 'main:app --host 0.0.0.0 --port 8001',  // 8000 yerine 8001
      interpreter: 'python',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        ENVIRONMENT: 'production',
        DEBUG: 'false'
      }
    },
    {
      name: 'cliff-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001  // 3000 yerine 3001
      }
    }
  ]
};
