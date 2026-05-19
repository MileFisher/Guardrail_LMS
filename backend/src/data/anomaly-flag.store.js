const { v4: uuidv4 } = require("uuid");
const { query } = require("../db");

function toNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

function mapAnomalyFlag(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    submissionId: row.submission_id,
    sessionId: row.session_id,
    studentId: row.student_id,
    wpmZ: toNumber(row.wpm_z),
    pasteZ: toNumber(row.paste_z),
    revisionZ: toNumber(row.revision_z),
    compositeZ: toNumber(row.composite_z),
    confidencePct: toNumber(row.confidence_pct),
    zscoreThresholdSnapshot: toNumber(row.zscore_threshold_snapshot),
    pasteThresholdCharsSnapshot: row.paste_threshold_chars_snapshot,
    pasteTriggered: row.paste_triggered,
    status: row.status,
    teacherNotes: row.teacher_notes,
    studentAppeal: row.student_appeal,
    flaggedAt: row.flagged_at,
    reviewedAt: row.reviewed_at
  };
}

async function upsertAnomalyFlag({
  sessionId,
  studentId,
  compositeZ,
  confidencePct,
  pasteTriggered,
  wpmZ,
  pasteZ,
  revisionZ,
  zscoreThresholdSnapshot,
  pasteThresholdCharsSnapshot
}) {
  const result = await query(
    `INSERT INTO anomaly_flags (
       id,
       submission_id,
       session_id,
       student_id,
       wpm_z,
       paste_z,
       revision_z,
       composite_z,
       confidence_pct,
       zscore_threshold_snapshot,
       paste_threshold_chars_snapshot,
       paste_triggered,
       status,
       flagged_at
     )
     VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12)
     ON CONFLICT (session_id) DO UPDATE
     SET student_id = EXCLUDED.student_id,
         wpm_z = EXCLUDED.wpm_z,
         paste_z = EXCLUDED.paste_z,
         revision_z = EXCLUDED.revision_z,
         composite_z = EXCLUDED.composite_z,
         confidence_pct = EXCLUDED.confidence_pct,
         zscore_threshold_snapshot = EXCLUDED.zscore_threshold_snapshot,
         paste_threshold_chars_snapshot = EXCLUDED.paste_threshold_chars_snapshot,
         paste_triggered = EXCLUDED.paste_triggered,
         flagged_at = EXCLUDED.flagged_at
     RETURNING
       id,
       submission_id,
       session_id,
       student_id,
       wpm_z,
       paste_z,
       revision_z,
       composite_z,
       confidence_pct,
       zscore_threshold_snapshot,
       paste_threshold_chars_snapshot,
       paste_triggered,
       status,
       teacher_notes,
       student_appeal,
       flagged_at,
       reviewed_at`,
    [
      uuidv4(),
      sessionId,
      studentId,
      wpmZ,
      pasteZ,
      revisionZ,
      compositeZ,
      confidencePct,
      zscoreThresholdSnapshot,
      pasteThresholdCharsSnapshot,
      pasteTriggered,
      new Date().toISOString()
    ]
  );

  return mapAnomalyFlag(result.rows[0]);
}

async function deleteAnomalyFlagBySessionId(sessionId) {
  await query("DELETE FROM anomaly_flags WHERE session_id = $1", [sessionId]);
}

async function listOwnFlags(studentId) {
  const result = await query(
    `SELECT
       af.id,
       af.submission_id,
       af.session_id,
       af.student_id,
       af.wpm_z,
       af.paste_z,
       af.revision_z,
       af.composite_z,
       af.confidence_pct,
       af.zscore_threshold_snapshot,
       af.paste_threshold_chars_snapshot,
       af.paste_triggered,
       af.status,
       af.teacher_notes,
       af.student_appeal,
       af.flagged_at,
       af.reviewed_at,
       a.id AS assignment_id,
       a.title AS assignment_title,
       c.id AS course_id,
       c.code AS course_code,
       c.title AS course_title
     FROM anomaly_flags af
     JOIN writing_sessions ws ON ws.id = af.session_id
     JOIN assignments a ON a.id = ws.assignment_id
     JOIN courses c ON c.id = a.course_id
     WHERE af.student_id = $1
     ORDER BY af.flagged_at DESC`,
    [studentId]
  );

  return result.rows.map((row) => ({
    ...mapAnomalyFlag(row),
    assignmentId: row.assignment_id,
    assignmentTitle: row.assignment_title,
    courseId: row.course_id,
    courseCode: row.course_code,
    courseTitle: row.course_title
  }));
}

async function listFlagsForStudentInCourse({ studentId, courseId }) {
  const result = await query(
    `SELECT
       af.id,
       af.submission_id,
       af.session_id,
       af.student_id,
       af.wpm_z,
       af.paste_z,
       af.revision_z,
       af.composite_z,
       af.confidence_pct,
       af.zscore_threshold_snapshot,
       af.paste_threshold_chars_snapshot,
       af.paste_triggered,
       af.status,
       af.teacher_notes,
       af.student_appeal,
       af.flagged_at,
       af.reviewed_at,
       a.id AS assignment_id,
       a.title AS assignment_title,
       c.id AS course_id,
       c.code AS course_code,
       c.title AS course_title
     FROM anomaly_flags af
     JOIN writing_sessions ws ON ws.id = af.session_id
     JOIN assignments a ON a.id = ws.assignment_id
     JOIN courses c ON c.id = a.course_id
     WHERE af.student_id = $1
       AND c.id = $2
     ORDER BY af.flagged_at DESC`,
    [studentId, courseId]
  );

  return result.rows.map((row) => ({
    ...mapAnomalyFlag(row),
    assignmentId: row.assignment_id,
    assignmentTitle: row.assignment_title,
    courseId: row.course_id,
    courseCode: row.course_code,
    courseTitle: row.course_title
  }));
}

async function getPasteTimelineBySessionIds(sessionIds) {
  if (!sessionIds.length) {
    return new Map();
  }

  const result = await query(
    `SELECT
       session_id,
       paste_chars,
       cumulative_paste_chars,
       timestamp_ms
     FROM keystroke_events
     WHERE session_id = ANY($1::text[])
       AND paste_chars > 0
     ORDER BY session_id ASC, timestamp_ms ASC`,
    [sessionIds]
  );

  const bySessionId = new Map();

  for (const row of result.rows) {
    const entries = bySessionId.get(row.session_id) || [];
    entries.push({
      timestamp: new Date(Number(row.timestamp_ms)).toISOString(),
      charCount: row.paste_chars,
      cumulativeChars: row.cumulative_paste_chars
    });
    bySessionId.set(row.session_id, entries);
  }

  return bySessionId;
}

async function getFlagWithContext(flagId) {
  const result = await query(
    `SELECT
       af.id,
       af.submission_id,
       af.session_id,
       af.student_id,
       af.wpm_z,
       af.paste_z,
       af.revision_z,
       af.composite_z,
       af.confidence_pct,
       af.zscore_threshold_snapshot,
       af.paste_threshold_chars_snapshot,
       af.paste_triggered,
       af.status,
       af.teacher_notes,
       af.student_appeal,
       af.flagged_at,
       af.reviewed_at,
       a.id AS assignment_id,
       a.title AS assignment_title,
       c.id AS course_id,
       c.code AS course_code,
       c.title AS course_title,
       sm.wpm,
       sm.paste_count,
       sm.paste_chars_total,
       sm.blur_count,
       sm.revision_rate,
       sm.avg_dwell_ms,
       sm.avg_flight_ms,
       s.content_text
     FROM anomaly_flags af
     JOIN writing_sessions ws ON ws.id = af.session_id
     JOIN assignments a ON a.id = ws.assignment_id
     JOIN courses c ON c.id = a.course_id
     LEFT JOIN session_metrics sm ON sm.session_id = ws.id
     LEFT JOIN submissions s ON s.session_id = ws.id
     WHERE af.id = $1
     LIMIT 1`,
    [flagId]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    ...mapAnomalyFlag(row),
    assignmentId: row.assignment_id,
    assignmentTitle: row.assignment_title,
    courseId: row.course_id,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    sessionData: {
      wpm: row.wpm === null ? null : Number(row.wpm),
      pasteCount: row.paste_count === null ? null : Number(row.paste_count),
      pasteCharsTotal: row.paste_chars_total === null ? null : Number(row.paste_chars_total),
      blurCount: row.blur_count === null ? null : Number(row.blur_count),
      revisionRate: row.revision_rate === null ? null : Number(row.revision_rate),
      avgDwellMs: row.avg_dwell_ms === null ? null : Number(row.avg_dwell_ms),
      avgFlightMs: row.avg_flight_ms === null ? null : Number(row.avg_flight_ms),
      contentText: row.content_text || ""
    }
  };
}

async function updateAnomalyFlag(flagId, changes) {
  const assignments = [];
  const values = [];

  if (changes.status !== undefined) {
    values.push(changes.status);
    assignments.push(`status = $${values.length}`);
  }

  if (changes.teacherNotes !== undefined) {
    values.push(changes.teacherNotes);
    assignments.push(`teacher_notes = $${values.length}`);
  }

  if (changes.studentAppeal !== undefined) {
    values.push(changes.studentAppeal);
    assignments.push(`student_appeal = $${values.length}`);
  }

  if (changes.reviewedAt !== undefined) {
    values.push(changes.reviewedAt);
    assignments.push(`reviewed_at = $${values.length}`);
  }

  if (!assignments.length) {
    return getFlagWithContext(flagId);
  }

  values.push(flagId);

  const result = await query(
    `UPDATE anomaly_flags
     SET ${assignments.join(", ")}
     WHERE id = $${values.length}
     RETURNING id`,
    values
  );

  if (!result.rows[0]) {
    return null;
  }

  return getFlagWithContext(flagId);
}

module.exports = {
  deleteAnomalyFlagBySessionId,
  getFlagWithContext,
  getPasteTimelineBySessionIds,
  listFlagsForStudentInCourse,
  listOwnFlags,
  mapAnomalyFlag,
  updateAnomalyFlag,
  upsertAnomalyFlag
};
