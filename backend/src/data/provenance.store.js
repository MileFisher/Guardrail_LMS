const { v4: uuidv4 } = require("uuid");
const { query } = require("../db");
const { EVENT_TYPES, SOURCE_TYPE_VALUES } = require("../constants/provenance");

function normalizeJsonArray(value) {
  return Array.isArray(value) ? value : [];
}

function mapProvenanceEvent(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    studentId: row.student_id,
    courseId: row.course_id,
    assignmentId: row.assignment_id,
    sessionId: row.session_id,
    studySessionId: row.study_session_id,
    submissionId: row.submission_id,
    lectureId: row.lecture_id,
    hintInteractionId: row.hint_interaction_id,
    eventType: row.event_type,
    sourceType: row.source_type,
    summaryText: row.summary_text,
    detailText: row.detail_text,
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
    createdBy: row.created_by,
    createdAt: row.created_at,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    assignmentTitle: row.assignment_title,
    lectureTitle: row.lecture_title,
    studentName: row.student_name
  };
}

function mapSubmissionReflection(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    submissionId: row.submission_id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    sessionId: row.session_id,
    declaredSources: normalizeJsonArray(row.declared_sources),
    reflectionText: row.reflection_text,
    transformationNotes: row.transformation_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function addProvenanceEvent({
  studentId,
  courseId,
  assignmentId = null,
  sessionId = null,
  studySessionId = null,
  submissionId = null,
  lectureId = null,
  hintInteractionId = null,
  eventType,
  sourceType = null,
  summaryText = "",
  detailText = "",
  metadata = {},
  createdBy = null
}) {
  const result = await query(
    `INSERT INTO provenance_events (
       id,
       student_id,
       course_id,
       assignment_id,
       session_id,
       study_session_id,
       submission_id,
       lecture_id,
       hint_interaction_id,
       event_type,
       source_type,
       summary_text,
       detail_text,
       metadata,
       created_by,
       created_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16)
     RETURNING
       id,
       student_id,
       course_id,
       assignment_id,
       session_id,
       study_session_id,
       submission_id,
       lecture_id,
       hint_interaction_id,
       event_type,
       source_type,
       summary_text,
       detail_text,
       metadata,
       created_by,
       created_at`,
    [
      uuidv4(),
      studentId,
      courseId,
      assignmentId,
      sessionId,
      studySessionId,
      submissionId,
      lectureId,
      hintInteractionId,
      eventType,
      sourceType,
      summaryText,
      detailText,
      JSON.stringify(metadata || {}),
      createdBy,
      new Date().toISOString()
    ]
  );

  return mapProvenanceEvent(result.rows[0]);
}

async function getLatestProvenanceEventForSession(sessionId, eventType) {
  const result = await query(
    `SELECT
       id,
       student_id,
       course_id,
       assignment_id,
       session_id,
       study_session_id,
       submission_id,
       lecture_id,
       hint_interaction_id,
       event_type,
       source_type,
       summary_text,
       detail_text,
       metadata,
       created_by,
       created_at
     FROM provenance_events
     WHERE session_id = $1
       AND event_type = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [sessionId, eventType]
  );

  return mapProvenanceEvent(result.rows[0]);
}

async function listProvenanceEventsForStudent(studentId, { limit = 100 } = {}) {
  const result = await query(
    `SELECT
       pe.*,
       c.code AS course_code,
       c.title AS course_title,
       a.title AS assignment_title,
       l.title AS lecture_title,
       u.display_name AS student_name
     FROM provenance_events pe
     JOIN courses c ON c.id = pe.course_id
     JOIN users u ON u.id = pe.student_id
     LEFT JOIN assignments a ON a.id = pe.assignment_id
     LEFT JOIN course_lectures l ON l.id = pe.lecture_id
     WHERE pe.student_id = $1
     ORDER BY pe.created_at DESC
     LIMIT $2`,
    [studentId, limit]
  );

  return result.rows.map(mapProvenanceEvent);
}

async function listProvenanceTimelineForStudent({
  studentId,
  courseId,
  assignmentId = null
}) {
  const result = await query(
    `SELECT
       pe.*,
       c.code AS course_code,
       c.title AS course_title,
       a.title AS assignment_title,
       l.title AS lecture_title,
       u.display_name AS student_name
     FROM provenance_events pe
     JOIN courses c ON c.id = pe.course_id
     JOIN users u ON u.id = pe.student_id
     LEFT JOIN assignments a ON a.id = pe.assignment_id
     LEFT JOIN course_lectures l ON l.id = pe.lecture_id
     WHERE pe.student_id = $1
       AND pe.course_id = $2
       AND ($3::text IS NULL OR pe.assignment_id = $3)
     ORDER BY pe.created_at ASC`,
    [studentId, courseId, assignmentId]
  );

  return result.rows.map(mapProvenanceEvent);
}

async function listProvenanceEventsForSession(sessionId) {
  const result = await query(
    `SELECT
       pe.*,
       c.code AS course_code,
       c.title AS course_title,
       a.title AS assignment_title,
       l.title AS lecture_title,
       u.display_name AS student_name
     FROM provenance_events pe
     JOIN courses c ON c.id = pe.course_id
     JOIN users u ON u.id = pe.student_id
     LEFT JOIN assignments a ON a.id = pe.assignment_id
     LEFT JOIN course_lectures l ON l.id = pe.lecture_id
     WHERE pe.session_id = $1
     ORDER BY pe.created_at ASC`,
    [sessionId]
  );

  return result.rows.map(mapProvenanceEvent);
}

async function upsertSubmissionReflection({
  submissionId,
  assignmentId,
  studentId,
  sessionId,
  declaredSources,
  reflectionText,
  transformationNotes
}) {
  const validSources = normalizeJsonArray(declaredSources).filter((source) => SOURCE_TYPE_VALUES.includes(source));

  const result = await query(
    `INSERT INTO submission_reflections (
       id,
       submission_id,
       assignment_id,
       student_id,
       session_id,
       declared_sources,
       reflection_text,
       transformation_notes,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $9)
     ON CONFLICT (submission_id) DO UPDATE
     SET declared_sources = EXCLUDED.declared_sources,
         reflection_text = EXCLUDED.reflection_text,
         transformation_notes = EXCLUDED.transformation_notes,
         updated_at = EXCLUDED.updated_at
     RETURNING
       id,
       submission_id,
       assignment_id,
       student_id,
       session_id,
       declared_sources,
       reflection_text,
       transformation_notes,
       created_at,
       updated_at`,
    [
      uuidv4(),
      submissionId,
      assignmentId,
      studentId,
      sessionId,
      JSON.stringify(validSources),
      reflectionText || "",
      transformationNotes || "",
      new Date().toISOString()
    ]
  );

  return mapSubmissionReflection(result.rows[0]);
}

async function getSubmissionReflectionBySession(sessionId) {
  const result = await query(
    `SELECT
       id,
       submission_id,
       assignment_id,
       student_id,
       session_id,
       declared_sources,
       reflection_text,
       transformation_notes,
       created_at,
       updated_at
     FROM submission_reflections
     WHERE session_id = $1
     LIMIT 1`,
    [sessionId]
  );

  return mapSubmissionReflection(result.rows[0]);
}

async function getSubmissionReflectionByStudentAndAssignment(studentId, assignmentId) {
  const result = await query(
    `SELECT
       id,
       submission_id,
       assignment_id,
       student_id,
       session_id,
       declared_sources,
       reflection_text,
       transformation_notes,
       created_at,
       updated_at
     FROM submission_reflections
     WHERE student_id = $1
       AND assignment_id = $2
     ORDER BY updated_at DESC
     LIMIT 1`,
    [studentId, assignmentId]
  );

  return mapSubmissionReflection(result.rows[0]);
}

async function listAuditDataset() {
  const result = await query(
    `SELECT
       pe.id,
       pe.created_at,
       pe.event_type,
       pe.source_type,
       pe.summary_text,
       pe.detail_text,
       pe.metadata,
       u.display_name AS student_name,
       u.email AS student_email,
       c.code AS course_code,
       c.title AS course_title,
       a.title AS assignment_title,
       sr.declared_sources,
       sr.reflection_text,
       sr.transformation_notes
     FROM provenance_events pe
     JOIN users u ON u.id = pe.student_id
     JOIN courses c ON c.id = pe.course_id
     LEFT JOIN assignments a ON a.id = pe.assignment_id
     LEFT JOIN submission_reflections sr ON sr.submission_id = pe.submission_id
     ORDER BY pe.created_at DESC`
  );

  return result.rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    eventType: row.event_type,
    sourceType: row.source_type,
    summaryText: row.summary_text,
    detailText: row.detail_text,
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
    studentName: row.student_name,
    studentEmail: row.student_email,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    assignmentTitle: row.assignment_title,
    declaredSources: normalizeJsonArray(row.declared_sources),
    reflectionText: row.reflection_text || "",
    transformationNotes: row.transformation_notes || ""
  }));
}

async function countLargePasteEventsWithoutDeclaration(sessionId) {
  const latestPaste = await getLatestProvenanceEventForSession(sessionId, EVENT_TYPES.LARGE_PASTE_DETECTED);
  if (!latestPaste) {
    return 0;
  }

  const latestDeclaration = await getLatestProvenanceEventForSession(sessionId, EVENT_TYPES.SOURCE_DECLARED);

  if (latestDeclaration && new Date(latestDeclaration.createdAt).getTime() >= new Date(latestPaste.createdAt).getTime()) {
    return 0;
  }

  return 1;
}

module.exports = {
  addProvenanceEvent,
  countLargePasteEventsWithoutDeclaration,
  getLatestProvenanceEventForSession,
  getSubmissionReflectionBySession,
  getSubmissionReflectionByStudentAndAssignment,
  listAuditDataset,
  listProvenanceEventsForSession,
  listProvenanceEventsForStudent,
  listProvenanceTimelineForStudent,
  mapProvenanceEvent,
  mapSubmissionReflection,
  upsertSubmissionReflection
};
