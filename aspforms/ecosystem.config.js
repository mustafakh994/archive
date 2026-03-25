module.exports = {
  apps: [
    {
      name: 'aspforms-backend',
      script: '/www/aspforms/bin/Debug/net8.0/FormsManagementApi.dll',
      cwd: '/www/aspforms',
      env: {
        ASPNETCORE_ENVIRONMENT: 'Production',
        ASPNETCORE_URLS: 'http://0.0.0.0:5002'
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/home/azureuser/.pm2/logs/aspforms-backend-error.log',
      out_file: '/home/azureuser/.pm2/logs/aspforms-backend-out.log',
      interpreter: '/usr/bin/dotnet',
    },
  ],
};
