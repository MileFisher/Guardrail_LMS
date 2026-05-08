const { v4: uuidv4 } = require("uuid");
const { query } = require("../db");

function mapMcqResponse(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    studySessionId: row.study_session_id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    answers: row.answers_json && typeof row.answers_json === "object" ? row.answers_json : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function upsertMcqResponse({ studySessionId, assignmentId, studentId, answers }) {
  const now = new Date().toISOString();
  const result = await query(
    `INSERT INTO mcq_responses (
       id,
       study_session_id,
       assignment_id,
       student_id,
       answers_json,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
     ON CONFLICT (assignment_id, student_id) DO UPDATE
     SET study_session_id = EXCLUDED.study_session_id,
         answers_json = EXCLUDED.answers_json,
         updated_at = EXCLUDED.updated_at
     RETURNING
       id,
       study_session_id,
       assignment_id,
       student_id,
       answers_json,
       created_at,
       updated_at`,
    [uuidv4(), studySessionId, assignmentId, studentId, JSON.stringify(answers || {}), now, now]
  );

  return mapMcqResponse(result.rows[0]);
}

module.exports = {
  upsertMcqResponse
};
