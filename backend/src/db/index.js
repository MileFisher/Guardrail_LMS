const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const env = require("../config/env");

const schemaPath = path.join(__dirname, "schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");

const pool = new Pool({
  connectionString: env.databaseUrl || undefined,
  host: env.databaseUrl ? undefined : env.dbHost,
  port: env.databaseUrl ? undefined : env.dbPort,
  user: env.databaseUrl ? undefined : env.dbUser,
  password: env.databaseUrl ? undefined : env.dbPassword,
  database: env.databaseUrl ? undefined : env.dbName,
  ssl: env.dbSsl ? { rejectUnauthorized: false } : false
});

async function query(text, params) {
  return pool.query(text, params);
}

async function withTransaction(callback) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function initializeDatabase() {
  await pool.query(schemaSql);
}

async function closeDatabase() {
  await pool.end();
}

module.exports = {
  closeDatabase,
  initializeDatabase,
  pool,
  query,
  withTransaction
};
