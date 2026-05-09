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

function mapTeacherSubmission(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    assignmentId: row.assignment_id,
    assignmentTitle: row.assignment_title,
    assignmentType: row.assignment_type,
    studentId: row.student_id,
    studentName: row.student_name,
    studentEmail: row.student_email,
    responseType: row.response_type,
    contentText: row.content_text || "",
    answers: row.answers_json && typeof row.answers_json === "object" ? row.answers_json : {},
    answeredCount: row.answered_count === null || row.answered_count === undefined ? null : Number(row.answered_count),
    totalQuestions: row.total_questions === null || row.total_questions === undefined ? null : Number(row.total_questions),
    status: row.status,
    activityAt: row.activity_at
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

async function listCourseSubmissions(courseId) {
  const result = await query(
    `SELECT
       merged.id,
       merged.assignment_id,
       merged.assignment_title,
       merged.assignment_type,
       merged.student_id,
       merged.student_name,
       merged.student_email,
       merged.response_type,
       merged.content_text,
       merged.answers_json,
       merged.answered_count,
       merged.total_questions,
       merged.status,
       merged.activity_at
     FROM (
       SELECT
         s.id,
         s.assignment_id,
         a.title AS assignment_title,
         a.assignment_type,
         s.student_id,
         u.display_name AS student_name,
         u.email AS student_email,
         'essay' AS response_type,
         s.content_text,
         NULL::jsonb AS answers_json,
         NULL::int AS answered_count,
         NULL::int AS total_questions,
         s.status,
         s.submitted_at AS activity_at
       FROM submissions s
       JOIN assignments a ON a.id = s.assignment_id
       JOIN users u ON u.id = s.student_id
       WHERE a.course_id = $1

       UNION ALL

       SELECT
         mr.id,
         mr.assignment_id,
         a.title AS assignment_title,
         a.assignment_type,
         mr.student_id,
         u.display_name AS student_name,
         u.email AS student_email,
         'mcq' AS response_type,
         NULL::text AS content_text,
         mr.answers_json,
         (
           SELECT COUNT(*)::int
           FROM jsonb_each(mr.answers_json)
         ) AS answered_count,
         COALESCE(jsonb_array_length(a.mcq_questions), 0) AS total_questions,
         'submitted' AS status,
         mr.submitted_at AS activity_at
       FROM mcq_responses mr
       JOIN assignments a ON a.id = mr.assignment_id
       JOIN users u ON u.id = mr.student_id
       WHERE a.course_id = $1
         AND mr.submitted_at IS NOT NULL
     ) merged
     ORDER BY merged.activity_at DESC`,
    [courseId]
  );

  return result.rows.map(mapTeacherSubmission);
}

module.exports = {
  createSubmission,
  listCourseSubmissions,
  mapSubmission
};
