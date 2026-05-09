const { v4: uuidv4 } = require("uuid");
const { query } = require("../db");

function mapLecture(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    courseId: row.course_id,
    createdBy: row.created_by,
    title: row.title,
    description: row.description || "",
    mediaType: row.media_type || "link",
    mediaUrl: row.media_url || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function createLecture({ courseId, createdBy, title, description = "", mediaType = "link", mediaUrl = "" }) {
  const result = await query(
    `INSERT INTO course_lectures (
       id,
       course_id,
       created_by,
       title,
       description,
       media_type,
       media_url,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     RETURNING
       id,
       course_id,
       created_by,
       title,
       description,
       media_type,
       media_url,
       created_at,
       updated_at`,
    [uuidv4(), courseId, createdBy, title, description, mediaType, mediaUrl || null, new Date().toISOString()]
  );

  return mapLecture(result.rows[0]);
}

async function listLecturesByCourse(courseId) {
  const result = await query(
    `SELECT
       id,
       course_id,
       created_by,
       title,
       description,
       media_type,
       media_url,
       created_at,
       updated_at
     FROM course_lectures
     WHERE course_id = $1
     ORDER BY created_at DESC`,
    [courseId]
  );

  return result.rows.map(mapLecture);
}

async function findLectureById(id) {
  const result = await query(
    `SELECT
       id,
       course_id,
       created_by,
       title,
       description,
       media_type,
       media_url,
       created_at,
       updated_at
     FROM course_lectures
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  return mapLecture(result.rows[0]);
}

async function updateLecture(id, changes = {}) {
  const assignments = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(changes, "title")) {
    values.push(changes.title);
    assignments.push(`title = $${values.length}`);
  }

  if (Object.prototype.hasOwnProperty.call(changes, "description")) {
    values.push(changes.description);
    assignments.push(`description = $${values.length}`);
  }

  if (Object.prototype.hasOwnProperty.call(changes, "mediaType")) {
    values.push(changes.mediaType);
    assignments.push(`media_type = $${values.length}`);
  }

  if (Object.prototype.hasOwnProperty.call(changes, "mediaUrl")) {
    values.push(changes.mediaUrl || null);
    assignments.push(`media_url = $${values.length}`);
  }

  if (assignments.length === 0) {
    return findLectureById(id);
  }

  values.push(new Date().toISOString());
  assignments.push(`updated_at = $${values.length}`);
  values.push(id);

  const result = await query(
    `UPDATE course_lectures
     SET ${assignments.join(", ")}
     WHERE id = $${values.length}
     RETURNING
       id,
       course_id,
       created_by,
       title,
       description,
       media_type,
       media_url,
       created_at,
       updated_at`,
    values
  );

  return mapLecture(result.rows[0]);
}

async function deleteLecture(id) {
  const result = await query(
    `DELETE FROM course_lectures
     WHERE id = $1
     RETURNING
       id,
       course_id,
       created_by,
       title,
       description,
       media_type,
       media_url,
       created_at,
       updated_at`,
    [id]
  );

  return mapLecture(result.rows[0]);
}

module.exports = {
  createLecture,
  deleteLecture,
  findLectureById,
  listLecturesByCourse,
  updateLecture
};
