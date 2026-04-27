const { v4: uuidv4 } = require("uuid");
const { query } = require("../db");

function toNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

function mapStudentBaseline(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    studentId: row.student_id,
    courseId: row.course_id,
    deviceType: row.device_type,
    meanWpm: toNumber(row.mean_wpm),
    stddevWpm: toNumber(row.stddev_wpm),
    meanDwellMs: toNumber(row.mean_dwell_ms),
    stddevDwellMs: toNumber(row.stddev_dwell_ms),
    meanFlightMs: toNumber(row.mean_flight_ms),
    stddevFlightMs: toNumber(row.stddev_flight_ms),
    meanRevisionRate: toNumber(row.mean_revision_rate),
    stddevRevisionRate: toNumber(row.stddev_revision_rate),
    meanPasteChars: toNumber(row.mean_paste_chars),
    stddevPasteChars: toNumber(row.stddev_paste_chars),
    sessionCount: row.session_count,
    isCalibrated: row.is_calibrated,
    updatedAt: row.updated_at
  };
}

async function getBaselineAggregate({ studentId, courseId, deviceType, excludeSessionId = null }) {
  const result = await query(
    `SELECT
       COUNT(*)::int AS session_count,
       AVG(sm.wpm) AS mean_wpm,
       STDDEV_SAMP(sm.wpm) AS stddev_wpm,
       AVG(sm.avg_dwell_ms) AS mean_dwell_ms,
       STDDEV_SAMP(sm.avg_dwell_ms) AS stddev_dwell_ms,
       AVG(sm.avg_flight_ms) AS mean_flight_ms,
       STDDEV_SAMP(sm.avg_flight_ms) AS stddev_flight_ms,
       AVG(sm.revision_rate) AS mean_revision_rate,
       STDDEV_SAMP(sm.revision_rate) AS stddev_revision_rate,
       AVG(sm.paste_chars_total) AS mean_paste_chars,
       STDDEV_SAMP(sm.paste_chars_total) AS stddev_paste_chars
     FROM session_metrics sm
     JOIN writing_sessions ws ON ws.id = sm.session_id
     JOIN assignments a ON a.id = ws.assignment_id
     WHERE ws.student_id = $1
       AND a.course_id = $2
       AND ws.device_type = $3
       AND ws.status IN ('completed', 'submitted')
       AND ($4::text IS NULL OR ws.id <> $4)`,
    [studentId, courseId, deviceType, excludeSessionId]
  );

  const row = result.rows[0] || {};

  return {
    studentId,
    courseId,
    deviceType,
    meanWpm: toNumber(row.mean_wpm),
    stddevWpm: toNumber(row.stddev_wpm),
    meanDwellMs: toNumber(row.mean_dwell_ms),
    stddevDwellMs: toNumber(row.stddev_dwell_ms),
    meanFlightMs: toNumber(row.mean_flight_ms),
    stddevFlightMs: toNumber(row.stddev_flight_ms),
    meanRevisionRate: toNumber(row.mean_revision_rate),
    stddevRevisionRate: toNumber(row.stddev_revision_rate),
    meanPasteChars: toNumber(row.mean_paste_chars),
    stddevPasteChars: toNumber(row.stddev_paste_chars),
    sessionCount: Number(row.session_count || 0),
    isCalibrated: Number(row.session_count || 0) >= 3
  };
}

async function upsertStudentBaseline({
  studentId,
  courseId,
  deviceType,
  meanWpm,
  stddevWpm,
  meanDwellMs,
  stddevDwellMs,
  meanFlightMs,
  stddevFlightMs,
  meanRevisionRate,
  stddevRevisionRate,
  meanPasteChars,
  stddevPasteChars,
  sessionCount,
  isCalibrated
}) {
  const result = await query(
    `INSERT INTO student_baselines (
       id,
       student_id,
       course_id,
       device_type,
       mean_wpm,
       stddev_wpm,
       mean_dwell_ms,
       stddev_dwell_ms,
       mean_flight_ms,
       stddev_flight_ms,
       mean_revision_rate,
       stddev_revision_rate,
       mean_paste_chars,
       stddev_paste_chars,
       session_count,
       is_calibrated,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     ON CONFLICT (student_id, course_id, device_type) DO UPDATE
     SET mean_wpm = EXCLUDED.mean_wpm,
         stddev_wpm = EXCLUDED.stddev_wpm,
         mean_dwell_ms = EXCLUDED.mean_dwell_ms,
         stddev_dwell_ms = EXCLUDED.stddev_dwell_ms,
         mean_flight_ms = EXCLUDED.mean_flight_ms,
         stddev_flight_ms = EXCLUDED.stddev_flight_ms,
         mean_revision_rate = EXCLUDED.mean_revision_rate,
         stddev_revision_rate = EXCLUDED.stddev_revision_rate,
         mean_paste_chars = EXCLUDED.mean_paste_chars,
         stddev_paste_chars = EXCLUDED.stddev_paste_chars,
         session_count = EXCLUDED.session_count,
         is_calibrated = EXCLUDED.is_calibrated,
         updated_at = EXCLUDED.updated_at
     RETURNING
       id,
       student_id,
       course_id,
       device_type,
       mean_wpm,
       stddev_wpm,
       mean_dwell_ms,
       stddev_dwell_ms,
       mean_flight_ms,
       stddev_flight_ms,
       mean_revision_rate,
       stddev_revision_rate,
       mean_paste_chars,
       stddev_paste_chars,
       session_count,
       is_calibrated,
       updated_at`,
    [
      uuidv4(),
      studentId,
      courseId,
      deviceType,
      meanWpm,
      stddevWpm,
      meanDwellMs,
      stddevDwellMs,
      meanFlightMs,
      stddevFlightMs,
      meanRevisionRate,
      stddevRevisionRate,
      meanPasteChars,
      stddevPasteChars,
      sessionCount,
      isCalibrated,
      new Date().toISOString()
    ]
  );

  return mapStudentBaseline(result.rows[0]);
}

async function listBaselinesByStudent(studentId) {
  const result = await query(
    `SELECT
       sb.id,
       sb.student_id,
       sb.course_id,
       sb.device_type,
       sb.mean_wpm,
       sb.stddev_wpm,
       sb.mean_dwell_ms,
       sb.stddev_dwell_ms,
       sb.mean_flight_ms,
       sb.stddev_flight_ms,
       sb.mean_revision_rate,
       sb.stddev_revision_rate,
       sb.mean_paste_chars,
       sb.stddev_paste_chars,
       sb.session_count,
       sb.is_calibrated,
       sb.updated_at,
       c.title AS course_title,
       c.code AS course_code
     FROM student_baselines sb
     JOIN courses c ON c.id = sb.course_id
     WHERE sb.student_id = $1
     ORDER BY c.title ASC, sb.device_type ASC`,
    [studentId]
  );

  return result.rows.map((row) => ({
    ...mapStudentBaseline(row),
    courseTitle: row.course_title,
    courseCode: row.course_code
  }));
}

module.exports = {
  getBaselineAggregate,
  listBaselinesByStudent,
  mapStudentBaseline,
  upsertStudentBaseline
};
