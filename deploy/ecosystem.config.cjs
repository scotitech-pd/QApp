// PM2 process file — `pm2 start deploy/ecosystem.config.cjs`
// Both apps read /srv/onq/app/.env (see deploy/env.production.example).
module.exports = {
  apps: [
    {
      name: "onq-api",
      cwd: "/srv/onq/app",
      script: "apps/api/dist/index.js",
      env: { NODE_ENV: "production" },
      max_memory_restart: "512M",
      out_file: "/srv/onq/logs/api.out.log",
      error_file: "/srv/onq/logs/api.err.log",
      time: true
    },
    {
      name: "onq-web",
      cwd: "/srv/onq/app/apps/web",
      script: "node_modules/next/dist/bin/next",
      args: "start --port 3000",
      env: { NODE_ENV: "production" },
      max_memory_restart: "512M",
      out_file: "/srv/onq/logs/web.out.log",
      error_file: "/srv/onq/logs/web.err.log",
      time: true
    }
  ]
};
