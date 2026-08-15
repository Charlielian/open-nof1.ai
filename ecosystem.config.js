module.exports = {
  apps: [
    {
      name: "open-nof1-web",
      cwd: process.env.PROJECT_DIR || "/path/to/project",
      script: "bun",
      args: "run start",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      time: true,
    },
    {
      name: "open-nof1-cron",
      cwd: process.env.PROJECT_DIR || "/path/to/project",
      script: "bun",
      args: "run cron.ts",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      time: true,
    },
  ],
};
