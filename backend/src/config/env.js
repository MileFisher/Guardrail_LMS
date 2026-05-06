const dotenv = require("dotenv");

dotenv.config();

const resolvedApiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || "";
const resolvedBaseUrl =
  process.env.OPENROUTER_BASE_URL ||
  process.env.OPENAI_BASE_URL ||
  (resolvedApiKey.startsWith("sk-or-") ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1");

const env = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
  databaseUrl: process.env.DATABASE_URL || "",
  dbHost: process.env.DB_HOST || "127.0.0.1",
  dbPort: Number(process.env.DB_PORT || 5433),
  dbUser: process.env.DB_USER || "postgres",
  dbPassword: process.env.DB_PASSWORD || "",
  dbName: process.env.DB_NAME || "guardrail_lms",
  dbSsl: process.env.DB_SSL === "true",
  openaiApiKey: resolvedApiKey,
  openaiBaseUrl: resolvedBaseUrl,
  openaiModel: process.env.OPENROUTER_MODEL || process.env.OPENAI_MODEL || "chat-latest",
  openaiTimeoutMs: Number(process.env.OPENROUTER_TIMEOUT_MS || process.env.OPENAI_TIMEOUT_MS || 30000),
  openRouterSiteUrl: process.env.OPENROUTER_SITE_URL || "",
  openRouterAppName: process.env.OPENROUTER_APP_NAME || process.env.OPENROUTER_TITLE || ""
};

module.exports = env;
