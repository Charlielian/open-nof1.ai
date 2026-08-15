module.exports = {
  apps: [
    {
      name: "open-nof1-web",
      cwd: "/Users/charlie-macmini/Documents/python/stock/open-nof1",
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
      cwd: "/Users/charlie-macmini/Documents/python/stock/open-nof1",
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
