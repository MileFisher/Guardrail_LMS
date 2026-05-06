const { v4: uuidv4 } = require("uuid");
const { query, withTransaction } = require("../db");

function mapSubmission(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    sessionId: row.session_id,
    fileUrl: row.file_url,
    contentText: row.content_text,
    status: row.status,
    submittedAt: row.submitted_at
  };
}

async function createSubmission({ assignmentId, studentId, sessionId, contentText }) {
  return withTransaction(async (client) => {
    const now = new Date().toISOString();
    const id = uuidv4();

    const result = await client.query(
      `INSERT INTO submissions (
         id,
         assignment_id,
         student_id,
         session_id,
         file_url,
         content_text,
         status,
         submitted_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'submitted', $7)
       ON CONFLICT (session_id) DO UPDATE
       SET file_url = EXCLUDED.file_url,
           content_text = EXCLUDED.content_text,
           status = 'submitted',
           submitted_at = EXCLUDED.submitted_at
       RETURNING id, assignment_id, student_id, session_id, file_url, content_text, status, submitted_at`,
      [id, assignmentId, studentId, sessionId, `db://submissions/${id}.txt`, contentText, now]
    );

    await client.query(
      `UPDATE writing_sessions
       SET status = 'submitted',
           submitted_at = COALESCE(submitted_at, $2),
           ended_at = COALESCE(ended_at, $2)
       WHERE id = $1`,
      [sessionId, now]
    );

    return mapSubmission(result.rows[0]);
  });
}

module.exports = {
  createSubmission,
  mapSubmission
};
