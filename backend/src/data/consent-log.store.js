const { v4: uuidv4 } = require("uuid");
const { query } = require("../db");

function mapConsentLog(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    policyVersion: row.policy_version,
    accepted: row.accepted,
    acceptedAt: row.accepted_at
  };
}

async function addConsentLog({ userId, policyVersion, acceptedAt }) {
  const result = await query(
    `INSERT INTO consents (id, user_id, accepted, policy_version, accepted_at)
     VALUES ($1, $2, TRUE, $3, $4)
     RETURNING id, user_id, accepted, policy_version, accepted_at`,
    [uuidv4(), userId, policyVersion, acceptedAt]
  );

  return mapConsentLog(result.rows[0]);
}

async function getConsentLogs() {
  const result = await query(
    `SELECT id, user_id, accepted, policy_version, accepted_at
     FROM consents
     ORDER BY accepted_at DESC`
  );

  return result.rows.map(mapConsentLog);
}

async function getConsentLogsByUserId(userId) {
  const result = await query(
    `SELECT id, user_id, accepted, policy_version, accepted_at
     FROM consents
     WHERE user_id = $1
     ORDER BY accepted_at DESC`,
    [userId]
  );

  return result.rows.map(mapConsentLog);
}

module.exports = {
  addConsentLog,
  getConsentLogs,
  getConsentLogsByUserId
};
