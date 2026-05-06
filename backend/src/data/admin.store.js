const { query } = require("../db");

const SETTINGS_KEY = "global_thresholds";

const DEFAULT_THRESHOLDS = {
  zscoreDefault: 3.0,
  pasteThresholdChars: 500,
  maxHintLevel: 3,
  loginRateLimitAttempts: 10,
  loginRateLimitWindowMin: 15
};

async function getThresholds() {
  const result = await query(
    `SELECT value
     FROM system_settings
     WHERE key = $1
     LIMIT 1`,
    [SETTINGS_KEY]
  );

  return {
    ...DEFAULT_THRESHOLDS,
    ...(result.rows[0]?.value || {})
  };
}

async function saveThresholds(thresholds) {
  const nextThresholds = {
    ...DEFAULT_THRESHOLDS,
    ...thresholds
  };

  const result = await query(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value,
         updated_at = EXCLUDED.updated_at
     RETURNING value`,
    [SETTINGS_KEY, JSON.stringify(nextThresholds), new Date().toISOString()]
  );

  return result.rows[0].value;
}

module.exports = {
  DEFAULT_THRESHOLDS,
  getThresholds,
  saveThresholds
};
