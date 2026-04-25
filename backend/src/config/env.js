const dotenv = require("dotenv");

dotenv.config();

const env = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
  databaseUrl: process.env.DATABASE_URL || "",
  dbHost: process.env.DB_HOST || "127.0.0.1",
  dbPort: Number(process.env.DB_PORT || 5432),
  dbUser: process.env.DB_USER || "postgres",
  dbPassword: process.env.DB_PASSWORD || "",
  dbName: process.env.DB_NAME || "guardrail_lms",
  dbSsl: process.env.DB_SSL === "true"
};

module.exports = env;
