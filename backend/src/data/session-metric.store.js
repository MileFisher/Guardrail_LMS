const { v4: uuidv4 } = require("uuid");
const { query } = require("../db");

function toNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

function mapSessionMetric(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    sessionId: row.session_id,
    avgDwellMs: toNumber(row.avg_dwell_ms),
    avgFlightMs: toNumber(row.avg_flight_ms),
    wpm: toNumber(row.wpm),
    revisionRate: toNumber(row.revision_rate),
    pasteCount: row.paste_count,
    pasteCharsTotal: row.paste_chars_total,
    blurCount: row.blur_count,
    computedAt: row.computed_at
  };
}

async function upsertSessionMetric({
  sessionId,
  avgDwellMs,
  avgFlightMs,
  wpm,
  revisionRate,
  pasteCount,
  pasteCharsTotal,
  blurCount
}) {
  const result = await query(
    `INSERT INTO session_metrics (
       id,
       session_id,
       avg_dwell_ms,
       avg_flight_ms,
       wpm,
       revision_rate,
       paste_count,
       paste_chars_total,
       blur_count,
       computed_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (session_id) DO UPDATE
     SET avg_dwell_ms = EXCLUDED.avg_dwell_ms,
         avg_flight_ms = EXCLUDED.avg_flight_ms,
         wpm = EXCLUDED.wpm,
         revision_rate = EXCLUDED.revision_rate,
         paste_count = EXCLUDED.paste_count,
         paste_chars_total = EXCLUDED.paste_chars_total,
         blur_count = EXCLUDED.blur_count,
         computed_at = EXCLUDED.computed_at
     RETURNING
       id,
       session_id,
       avg_dwell_ms,
       avg_flight_ms,
       wpm,
       revision_rate,
       paste_count,
       paste_chars_total,
       blur_count,
       computed_at`,
    [
      uuidv4(),
      sessionId,
      avgDwellMs,
      avgFlightMs,
      wpm,
      revisionRate,
      pasteCount,
      pasteCharsTotal,
      blurCount,
      new Date().toISOString()
    ]
  );

  return mapSessionMetric(result.rows[0]);
}

module.exports = {
  mapSessionMetric,
  upsertSessionMetric
};
