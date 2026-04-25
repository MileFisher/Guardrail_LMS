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
    title: row.title,
    prompt: row.prompt,
    maxHintLevel: row.max_hint_level,
    minWordsForHint: row.min_words_for_hint,
    zscoreThreshold: row.zscore_threshold === null ? null : Number(row.zscore_threshold),
    pasteThresholdChars: row.paste_threshold_chars,
    dueAt: row.due_at,
    createdAt: row.created_at
  };
}

async function createAssignment({
  courseId,
  createdBy,
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
       title,
       prompt,
       max_hint_level,
       min_words_for_hint,
       zscore_threshold,
       paste_threshold_chars,
       due_at,
       created_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING
       id, course_id, created_by, title, prompt, max_hint_level, min_words_for_hint,
       zscore_threshold, paste_threshold_chars, due_at, created_at`,
    [
      uuidv4(),
      courseId,
      createdBy,
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

async function listAssignmentsByCourse(courseId) {
  const result = await query(
    `SELECT
       id, course_id, created_by, title, prompt, max_hint_level, min_words_for_hint,
       zscore_threshold, paste_threshold_chars, due_at, created_at
     FROM assignments
     WHERE course_id = $1
     ORDER BY created_at DESC`,
    [courseId]
  );

  return result.rows.map(mapAssignment);
}

async function findAssignmentById(id) {
  const result = await query(
    `SELECT
       id, course_id, created_by, title, prompt, max_hint_level, min_words_for_hint,
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
