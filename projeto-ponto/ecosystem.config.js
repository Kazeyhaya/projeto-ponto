module.exports = {
  apps: [{
    name: "ponto-digital",
    script: "./index.js",
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "development",
      PORT: 5434
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 5434
    },
   
  }]
};
