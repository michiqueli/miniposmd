module.exports = {
  apps: [{
    name: "ecoparri",
    script: "node_modules/next/dist/bin/next",
    args: "start",
    instances: 1, // No uses 'max' si el VPS es chico
    exec_mode: "fork", // 'fork' consume menos que 'cluster'
    memory_threshold: "400M", // Reinicia si se pasa de mambo
    env: {
      NODE_ENV: "production",
      AUTH_SECRET: "WOJlRyBXnyK40rt9poelKdstLfR7R/KWTBkmYdP+IPk="
    }
  }]
}