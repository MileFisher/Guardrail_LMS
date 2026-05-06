const { v4: uuidv4 } = require("uuid");
const { query } = require("../db");

function mapAssignment(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    courseId: row.course_id,
    createdBy: row.created_by,
    assignmentType: row.assignment_type || "essay",
    title: row.title,
    prompt: row.prompt,
    maxHintLevel: row.max_hint_level,
    minWordsForHint: row.min_words_for_hint,
    zscoreThreshold: row.zscore_threshold === null ? null : Number(row.zscore_threshold),
    pasteThresholdChars: row.paste_threshold_chars,
    dueAt: row.due_at,
    createdAt: row.created_at,
    submittedAt: row.submitted_at || null,
    submissionCount: row.submission_count === undefined ? undefined : Number(row.submission_count || 0),
    totalStudents: row.total_students === undefined ? undefined : Number(row.total_students || 0)
  };
}

async function createAssignment({
  courseId,
  createdBy,
  assignmentType = "essay",
  title,
  prompt,
  maxHintLevel = 3,
  minWordsForHint = 50,
  zscoreThreshold = null,
  pasteThresholdChars = null,
  dueAt = null
}) {
  const result = await query(
    `INSERT INTO assignments (
       id,
       course_id,
       created_by,
       assignment_type,
       title,
       prompt,
       max_hint_level,
       min_words_for_hint,
       zscore_threshold,
       paste_threshold_chars,
       due_at,
       created_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING
       id, course_id, created_by, assignment_type, title, prompt, max_hint_level, min_words_for_hint,
       zscore_threshold, paste_threshold_chars, due_at, created_at`,
    [
      uuidv4(),
      courseId,
      createdBy,
      assignmentType,
      title,
      prompt,
      maxHintLevel,
      minWordsForHint,
      zscoreThreshold,
      pasteThresholdChars,
      dueAt,
      new Date().toISOString()
    ]
  );

  return mapAssignment(result.rows[0]);
}

async function listAssignmentsByCourse(courseId, options = {}) {
  const studentId = options.studentId || null;
  const result = await query(
    `SELECT
       a.id,
       a.course_id,
       a.created_by,
       a.assignment_type,
       a.title,
       a.prompt,
       a.max_hint_level,
       a.min_words_for_hint,
       a.zscore_threshold,
       a.paste_threshold_chars,
       a.due_at,
       a.created_at,
       own_submission.submitted_at,
       COALESCE(submission_counts.submission_count, 0) AS submission_count,
       COALESCE(enrollment_counts.total_students, 0) AS total_students
     FROM assignments a
     LEFT JOIN LATERAL (
       SELECT s.submitted_at
       FROM submissions s
       WHERE s.assignment_id = a.id
         AND ($2::text IS NULL OR s.student_id = $2)
       ORDER BY s.submitted_at DESC
       LIMIT 1
     ) own_submission ON TRUE
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS submission_count
       FROM submissions s
       WHERE s.assignment_id = a.id
     ) submission_counts ON TRUE
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS total_students
       FROM enrollments e
       WHERE e.course_id = a.course_id
     ) enrollment_counts ON TRUE
     WHERE a.course_id = $1
     ORDER BY a.created_at DESC`,
    [courseId, studentId]
  );

  return result.rows.map(mapAssignment);
}

async function findAssignmentById(id) {
  const result = await query(
    `SELECT
       id, course_id, created_by, assignment_type, title, prompt, max_hint_level, min_words_for_hint,
       zscore_threshold, paste_threshold_chars, due_at, created_at
     FROM assignments
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  return mapAssignment(result.rows[0]);
}

module.exports = {
  createAssignment,
  findAssignmentById,
  listAssignmentsByCourse
};
