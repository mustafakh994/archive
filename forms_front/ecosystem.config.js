module.exports = {
  apps: [
    {
      name: 'forms-front',
      script: 'npm',
      args: 'start',
      cwd: '/www/forms_front',
      env: {
        NODE_ENV: 'production',
        PORT: 5155,
        NEXT_PUBLIC_API_URL: 'https://api.forms.hamaprov.net/api'
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/home/azureuser/.pm2/logs/forms-front-error.log',
      out_file: '/home/azureuser/.pm2/logs/forms-front-out.log',
      log_file: '/home/azureuser/.pm2/logs/forms-front-combined.log',
      time: true
    }
  ]
};
