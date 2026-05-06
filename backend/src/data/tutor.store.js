const { v4: uuidv4 } = require("uuid");
const { query, withTransaction } = require("../db");

function mapStudySession(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    courseId: row.course_id,
    studentId: row.student_id,
    assignmentId: row.assignment_id,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at
  };
}

function mapHintInteraction(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    studySessionId: row.study_session_id,
    studentId: row.student_id,
    assignmentId: row.assignment_id,
    courseId: row.course_id,
    hintLevel: `L${row.hint_level}`,
    studentMessage: row.student_message,
    aiResponse: row.ai_response,
    wordsTyped: row.words_typed_before,
    jailbreakDetected: row.jailbreak_detected,
    createdAt: row.created_at
  };
}

function mapLatestHintInteraction(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    studySessionId: row.study_session_id,
    hintLevel: Number(row.hint_level),
    createdAt: row.created_at
  };
}

async function getOrCreateActiveStudySession({ courseId, studentId, assignmentId }) {
  return withTransaction(async (client) => {
    const existing = await client.query(
      `SELECT id, course_id, student_id, assignment_id, status, started_at, ended_at
       FROM study_sessions
       WHERE course_id = $1
         AND student_id = $2
         AND ($3::text IS NULL OR assignment_id = $3)
         AND status = 'active'
       ORDER BY started_at DESC
       LIMIT 1`,
      [courseId, studentId, assignmentId || null]
    );

    if (existing.rows[0]) {
      return mapStudySession(existing.rows[0]);
    }

    const result = await client.query(
      `INSERT INTO study_sessions (id, course_id, student_id, assignment_id, status, started_at)
       VALUES ($1, $2, $3, $4, 'active', $5)
       RETURNING id, course_id, student_id, assignment_id, status, started_at, ended_at`,
      [uuidv4(), courseId, studentId, assignmentId || null, new Date().toISOString()]
    );

    return mapStudySession(result.rows[0]);
  });
}

async function addHintInteraction({
  studySessionId,
  studentId,
  hintLevel,
  studentMessage,
  aiResponse,
  wordsTyped,
  jailbreakDetected
}) {
  const result = await query(
    `INSERT INTO hint_interactions (
       id,
       study_session_id,
       student_id,
       hint_level,
       student_message,
       ai_response,
       words_typed_before,
       jailbreak_detected,
       created_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING
       id,
       study_session_id,
       student_id,
       hint_level,
       student_message,
       ai_response,
       words_typed_before,
       jailbreak_detected,
       created_at`,
    [
      uuidv4(),
      studySessionId,
      studentId,
      hintLevel,
      studentMessage,
      aiResponse,
      wordsTyped || 0,
      Boolean(jailbreakDetected),
      new Date().toISOString()
    ]
  );

  return mapHintInteraction(result.rows[0]);
}

async function getLatestHintInteractionForStudySession(studySessionId) {
  const result = await query(
    `SELECT
       id,
       study_session_id,
       hint_level,
       created_at
     FROM hint_interactions
     WHERE study_session_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [studySessionId]
  );

  return mapLatestHintInteraction(result.rows[0]);
}

async function closeActiveStudySession({ courseId, studentId, assignmentId }) {
  const result = await query(
    `UPDATE study_sessions
     SET status = 'closed',
         ended_at = COALESCE(ended_at, $4)
     WHERE course_id = $1
       AND student_id = $2
       AND ($3::text IS NULL OR assignment_id = $3)
       AND status = 'active'
     RETURNING id, course_id, student_id, assignment_id, status, started_at, ended_at`,
    [courseId, studentId, assignmentId || null, new Date().toISOString()]
  );

  return result.rows.map(mapStudySession);
}

async function listHintInteractionsForStudent({ studentId, courseId }) {
  const result = await query(
    `SELECT
       hi.id,
       hi.study_session_id,
       hi.student_id,
       hi.hint_level,
       hi.student_message,
       hi.ai_response,
       hi.words_typed_before,
       hi.jailbreak_detected,
       hi.created_at,
       ss.assignment_id,
       ss.course_id
     FROM hint_interactions hi
     JOIN study_sessions ss ON ss.id = hi.study_session_id
     WHERE hi.student_id = $1
       AND ss.course_id = $2
     ORDER BY hi.created_at DESC`,
    [studentId, courseId]
  );

  return result.rows.map(mapHintInteraction);
}

async function countHintsByCourse(courseId) {
  const result = await query(
    `SELECT student_id, COUNT(*)::int AS hint_count
     FROM hint_interactions hi
     JOIN study_sessions ss ON ss.id = hi.study_session_id
     WHERE ss.course_id = $1
     GROUP BY student_id`,
    [courseId]
  );

  return new Map(result.rows.map((row) => [row.student_id, Number(row.hint_count || 0)]));
}

module.exports = {
  addHintInteraction,
  closeActiveStudySession,
  countHintsByCourse,
  getLatestHintInteractionForStudySession,
  getOrCreateActiveStudySession,
  listHintInteractionsForStudent
};
