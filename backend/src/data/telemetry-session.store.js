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

function normalizeTimestamp(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const numeric = Number(value);

    if (Number.isFinite(numeric)) {
      return numeric;
    }

    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function buildEventRows(sessionId, body, startingCumulativePasteChars = 0) {
  const events = Array.isArray(body.events) && body.events.length ? body.events : [body];
  let cumulativePasteChars = startingCumulativePasteChars;

  return events.map((event) => {
    const pasteChars = normalizeNumber(
      event.pasteChars ??
      event.paste_chars ??
      event.pasteCharsDelta ??
      event.charCount ??
      body.pasteChars
    ) || 0;
    const explicitCumulative = normalizeNumber(
      event.cumulativePasteChars ??
      event.cumulative_paste_chars ??
      event.cumulativeChars ??
      event.cumulative_chars
    );

    cumulativePasteChars = explicitCumulative ?? cumulativePasteChars + pasteChars;

    return {
      sessionId,
      eventType: event.eventType || event.event_type || event.type || "batch",
      keyCode: event.keyCode || event.key_code || event.code || event.key || null,
      dwellMs: normalizeNumber(event.dwellMs ?? event.dwell_ms ?? event.dwellTime),
      flightMs: normalizeNumber(event.flightMs ?? event.flight_ms ?? event.flightTime),
      pasteChars,
      cumulativePasteChars,
      blurCountDelta: normalizeNumber(event.blurCountDelta ?? event.blur_count_delta) || 0,
      timestampMs:
        normalizeTimestamp(
          event.timestampMs ??
          event.timestamp_ms ??
          event.timestamp ??
          body.timestampMs ??
          body.timestamp
        ) || Date.now(),
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

async function getTelemetrySessionAnalysisContext(id) {
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
       a.course_id,
       a.title AS assignment_title,
       a.zscore_threshold,
       a.paste_threshold_chars,
       c.code AS course_code,
       c.title AS course_title
     FROM writing_sessions ws
     JOIN assignments a ON a.id = ws.assignment_id
     JOIN courses c ON c.id = a.course_id
     WHERE ws.id = $1
     LIMIT 1`,
    [id]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    ...mapTelemetrySession(row),
    courseId: row.course_id,
    assignmentTitle: row.assignment_title,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    zscoreThreshold: row.zscore_threshold === null ? null : Number(row.zscore_threshold),
    pasteThresholdChars: row.paste_threshold_chars
  };
}

async function markTelemetrySessionCompleted(id, endedAt) {
  const result = await query(
    `UPDATE writing_sessions
     SET status = 'completed',
         ended_at = COALESCE(ended_at, $2)
     WHERE id = $1
     RETURNING id`,
    [id, endedAt]
  );

  if (!result.rows[0]) {
    return null;
  }

  return getTelemetrySessionAnalysisContext(id);
}

async function listTelemetryEventsBySessionId(sessionId) {
  const result = await query(
    `SELECT
       id,
       event_type,
       key_code,
       dwell_ms,
       flight_ms,
       paste_chars,
       cumulative_paste_chars,
       blur_count_delta,
       timestamp_ms
     FROM keystroke_events
     WHERE session_id = $1
     ORDER BY timestamp_ms ASC, id ASC`,
    [sessionId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    eventType: row.event_type,
    keyCode: row.key_code,
    dwellMs: row.dwell_ms === null ? null : Number(row.dwell_ms),
    flightMs: row.flight_ms === null ? null : Number(row.flight_ms),
    pasteChars: row.paste_chars === null ? null : Number(row.paste_chars),
    cumulativePasteChars: row.cumulative_paste_chars === null ? null : Number(row.cumulative_paste_chars),
    blurCountDelta: row.blur_count_delta === null ? null : Number(row.blur_count_delta),
    timestampMs: row.timestamp_ms === null ? null : Number(row.timestamp_ms)
  }));
}

async function listTelemetrySessionsByStudent(studentId) {
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
       a.title AS assignment_title,
       c.id AS course_id,
       c.code AS course_code,
       sm.avg_dwell_ms,
       sm.avg_flight_ms,
       sm.wpm,
       sm.revision_rate,
       sm.paste_count,
       sm.paste_chars_total,
       sm.blur_count,
       sm.computed_at
     FROM writing_sessions ws
     JOIN assignments a ON a.id = ws.assignment_id
     JOIN courses c ON c.id = a.course_id
     LEFT JOIN session_metrics sm ON sm.session_id = ws.id
     WHERE ws.student_id = $1
     ORDER BY ws.started_at ASC`,
    [studentId]
  );

  return result.rows.map((row) => ({
    ...mapTelemetrySession(row),
    assignmentTitle: row.assignment_title,
    courseId: row.course_id,
    courseCode: row.course_code,
    avgDwellMs: row.avg_dwell_ms === null ? null : Number(row.avg_dwell_ms),
    avgFlightMs: row.avg_flight_ms === null ? null : Number(row.avg_flight_ms),
    wpm: row.wpm === null ? null : Number(row.wpm),
    revisionRate: row.revision_rate === null ? null : Number(row.revision_rate),
    pasteCount: row.paste_count,
    pasteCharsTotal: row.paste_chars_total,
    blurCount: row.blur_count,
    computedAt: row.computed_at
  }));
}

async function addTelemetryPayload(sessionId, payload) {
  return withTransaction(async (client) => {
    const latestEventResult = await client.query(
      `SELECT cumulative_paste_chars
       FROM keystroke_events
       WHERE session_id = $1
       ORDER BY timestamp_ms DESC, id DESC
       LIMIT 1`,
      [sessionId]
    );
    const startingCumulativePasteChars = latestEventResult.rows[0]?.cumulative_paste_chars || 0;
    const eventRows = buildEventRows(sessionId, payload.body || {}, startingCumulativePasteChars);

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
  getTelemetrySessionAnalysisContext,
  getTelemetrySessionById,
  listTelemetryEventsBySessionId,
  listTelemetrySessionsByStudent,
  markTelemetrySessionCompleted
};
