require("dotenv").config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "dashauto-secret-key",
  db: {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || "dashauto",
    password: process.env.DB_PASSWORD || "dashauto123",
    database: process.env.DB_NAME || "dashauto_db",
  },
};
