const { v4: uuidv4 } = require("uuid");
const { query, withTransaction } = require("../db");

const defaultPolicy = {
  version: "v1",
  contentMarkdown:
    "By using Guardrail LMS, you consent to keystroke timing telemetry collection during monitored writing sessions."
};

function mapPolicy(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    version: row.version,
    contentMarkdown: row.content_markdown,
    isActive: row.is_active,
    publishedAt: row.published_at
  };
}

async function getAllPolicies() {
  const result = await query(
    `SELECT id, version, content_markdown, is_active, published_at
     FROM consent_policies
     ORDER BY published_at DESC`
  );

  return result.rows.map(mapPolicy);
}

async function getActivePolicy() {
  const result = await query(
    `SELECT id, version, content_markdown, is_active, published_at
     FROM consent_policies
     WHERE is_active = TRUE
     ORDER BY published_at DESC
     LIMIT 1`
  );

  return mapPolicy(result.rows[0]);
}

async function getPolicyByVersion(version) {
  const result = await query(
    `SELECT id, version, content_markdown, is_active, published_at
     FROM consent_policies
     WHERE version = $1
     LIMIT 1`,
    [version]
  );

  return mapPolicy(result.rows[0]);
}

async function addPolicy({ version, contentMarkdown }) {
  return withTransaction(async (client) => {
    await client.query("UPDATE consent_policies SET is_active = FALSE WHERE is_active = TRUE");

    const result = await client.query(
      `INSERT INTO consent_policies (id, version, content_markdown, is_active, published_at)
       VALUES ($1, $2, $3, TRUE, $4)
       RETURNING id, version, content_markdown, is_active, published_at`,
      [uuidv4(), version, contentMarkdown, new Date().toISOString()]
    );

    return mapPolicy(result.rows[0]);
  });
}

async function ensureDefaultPolicy() {
  const existingPolicy = await getActivePolicy();

  if (existingPolicy) {
    return existingPolicy;
  }

  return addPolicy(defaultPolicy);
}

module.exports = {
  addPolicy,
  ensureDefaultPolicy,
  getActivePolicy,
  getAllPolicies,
  getPolicyByVersion
};
