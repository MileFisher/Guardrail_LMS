const app = require("./app");
const env = require("./config/env");
const { closeDatabase, initializeDatabase } = require("./db");
const { ensureDefaultPolicy } = require("./data/consent-policy.store");

async function startServer() {
  await initializeDatabase();
  await ensureDefaultPolicy();

  const server = app.listen(env.port, () => {
    console.log(`Guardrail LMS backend listening on port ${env.port}`);
  });

  async function shutdown(signal) {
    console.log(`Received ${signal}. Shutting down gracefully.`);
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  }

  process.on("SIGINT", () => {
    shutdown("SIGINT").catch((error) => {
      console.error("Failed to shut down cleanly.", error);
      process.exit(1);
    });
  });

  process.on("SIGTERM", () => {
    shutdown("SIGTERM").catch((error) => {
      console.error("Failed to shut down cleanly.", error);
      process.exit(1);
    });
  });
}

startServer().catch((error) => {
  console.error("Failed to initialize Guardrail LMS backend.", error);
  process.exit(1);
});
