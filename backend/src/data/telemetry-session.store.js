const { v4: uuidv4 } = require("uuid");
const { query, withTransaction } = require("../db");

function mapTelemetrySession(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    assignmentId: row.assignment_id,
    userId: row.student_id,
    deviceType: row.device_type,
    screenResolution: row.screen_resolution,
    hmacKey: row.hmac_key_id,
    status: row.status,
    createdAt: row.started_at,
    endedAt: row.ended_at,
    submittedAt: row.submitted_at,
    payloadCount: Number(row.payload_count || 0)
  };
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function buildEventRows(sessionId, body) {
  const events = Array.isArray(body.events) && body.events.length ? body.events : [body];
  let cumulativePasteChars = 0;

  return events.map((event) => {
    const pasteChars = normalizeNumber(
      event.pasteChars ?? event.paste_chars ?? event.pasteCharsDelta ?? body.pasteChars
    ) || 0;
    const explicitCumulative = normalizeNumber(
      event.cumulativePasteChars ?? event.cumulative_paste_chars ?? event.cumulativeChars
    );

    cumulativePasteChars = explicitCumulative ?? cumulativePasteChars + pasteChars;

    return {
      sessionId,
      eventType: event.eventType || event.event_type || "batch",
      keyCode: event.keyCode || event.key_code || null,
      dwellMs: normalizeNumber(event.dwellMs ?? event.dwell_ms),
      flightMs: normalizeNumber(event.flightMs ?? event.flight_ms),
      pasteChars,
      cumulativePasteChars,
      blurCountDelta: normalizeNumber(event.blurCountDelta ?? event.blur_count_delta) || 0,
      timestampMs:
        normalizeNumber(event.timestampMs ?? event.timestamp_ms ?? body.timestampMs) || Date.now(),
      rawPayload: event
    };
  });
}

async function createTelemetrySession({ assignmentId, userId, deviceType, screenResolution, hmacKey }) {
  const result = await query(
    `INSERT INTO writing_sessions (
       id, assignment_id, student_id, device_type, screen_resolution, status, hmac_key_id, started_at
     )
     VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
     RETURNING id, assignment_id, student_id, device_type, screen_resolution, hmac_key_id, status, started_at, ended_at, submitted_at`,
    [uuidv4(), assignmentId, userId, deviceType || "laptop", screenResolution || "unknown", hmacKey, new Date().toISOString()]
  );

  return mapTelemetrySession({ ...result.rows[0], payload_count: 0 });
}

async function getTelemetrySessionById(id) {
  const result = await query(
    `SELECT
       ws.id,
       ws.assignment_id,
       ws.student_id,
       ws.device_type,
       ws.screen_resolution,
       ws.hmac_key_id,
       ws.status,
       ws.started_at,
       ws.ended_at,
       ws.submitted_at,
       COUNT(ke.id) AS payload_count
     FROM writing_sessions ws
     LEFT JOIN keystroke_events ke ON ke.session_id = ws.id
     WHERE ws.id = $1
     GROUP BY ws.id
     LIMIT 1`,
    [id]
  );

  return mapTelemetrySession(result.rows[0]);
}

async function addTelemetryPayload(sessionId, payload) {
  const eventRows = buildEventRows(sessionId, payload.body || {});

  return withTransaction(async (client) => {
    for (const eventRow of eventRows) {
      await client.query(
        `INSERT INTO keystroke_events (
           session_id,
           event_type,
           key_code,
           dwell_ms,
           flight_ms,
           paste_chars,
           cumulative_paste_chars,
           blur_count_delta,
           timestamp_ms,
           raw_payload
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
        [
          eventRow.sessionId,
          eventRow.eventType,
          eventRow.keyCode,
          eventRow.dwellMs,
          eventRow.flightMs,
          eventRow.pasteChars,
          eventRow.cumulativePasteChars,
          eventRow.blurCountDelta,
          eventRow.timestampMs,
          JSON.stringify({
            receivedAt: payload.receivedAt,
            rawBody: payload.rawBody,
            event: eventRow.rawPayload
          })
        ]
      );
    }

    const sessionResult = await client.query(
      `SELECT
         ws.id,
         ws.assignment_id,
         ws.student_id,
         ws.device_type,
         ws.screen_resolution,
         ws.hmac_key_id,
         ws.status,
         ws.started_at,
         ws.ended_at,
         ws.submitted_at,
         COUNT(ke.id) AS payload_count
       FROM writing_sessions ws
       LEFT JOIN keystroke_events ke ON ke.session_id = ws.id
       WHERE ws.id = $1
       GROUP BY ws.id
       LIMIT 1`,
      [sessionId]
    );

    return mapTelemetrySession(sessionResult.rows[0]);
  });
}

module.exports = {
  addTelemetryPayload,
  createTelemetrySession,
  getTelemetrySessionById
};
