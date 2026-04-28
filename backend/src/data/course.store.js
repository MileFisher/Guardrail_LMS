const { v4: uuidv4 } = require("uuid");
const { query, withTransaction } = require("../db");

function mapCourse(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    teacherId: row.teacher_id,
    title: row.title,
    code: row.code,
    isActive: row.is_active,
    createdAt: row.created_at
  };
}

async function createCourse({ teacherId, title, code, isActive = true }) {
  const result = await query(
    `INSERT INTO courses (id, teacher_id, title, code, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, teacher_id, title, code, is_active, created_at`,
    [uuidv4(), teacherId, title, code, isActive, new Date().toISOString()]
  );

  return mapCourse(result.rows[0]);
}

async function findCourseById(id) {
  const result = await query(
    `SELECT id, teacher_id, title, code, is_active, created_at
     FROM courses
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  return mapCourse(result.rows[0]);
}

async function getCourseWithTeacherById(id) {
  const result = await query(
    `SELECT
       c.id,
       c.teacher_id,
       c.title,
       c.code,
       c.is_active,
       c.created_at,
       u.display_name AS teacher_name,
       u.email AS teacher_email
     FROM courses c
     JOIN users u ON u.id = c.teacher_id
     WHERE c.id = $1
     LIMIT 1`,
    [id]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    ...mapCourse(row),
    teacherName: row.teacher_name,
    teacherEmail: row.teacher_email
  };
}

async function listCoursesForTeacher(teacherId) {
  const result = await query(
    `SELECT id, teacher_id, title, code, is_active, created_at
     FROM courses
     WHERE teacher_id = $1
     ORDER BY created_at DESC`,
    [teacherId]
  );

  return result.rows.map(mapCourse);
}

async function listAllCourses() {
  const result = await query(
    `SELECT id, teacher_id, title, code, is_active, created_at
     FROM courses
     ORDER BY created_at DESC`
  );

  return result.rows.map(mapCourse);
}

async function listCoursesForStudent(studentId) {
  const result = await query(
    `SELECT c.id, c.teacher_id, c.title, c.code, c.is_active, c.created_at
     FROM courses c
     JOIN enrollments e ON e.course_id = c.id
     WHERE e.student_id = $1
     ORDER BY c.created_at DESC`,
    [studentId]
  );

  return result.rows.map(mapCourse);
}

async function createEnrollment({ courseId, studentId }) {
  const result = await query(
    `INSERT INTO enrollments (id, course_id, student_id, enrolled_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (course_id, student_id) DO UPDATE SET student_id = EXCLUDED.student_id
     RETURNING id, course_id, student_id, enrolled_at`,
    [uuidv4(), courseId, studentId, new Date().toISOString()]
  );

  const row = result.rows[0];

  return {
    id: row.id,
    courseId: row.course_id,
    studentId: row.student_id,
    enrolledAt: row.enrolled_at
  };
}

async function createEnrollments(courseId, studentIds) {
  return withTransaction(async (client) => {
    const enrollments = [];

    for (const studentId of studentIds) {
      const result = await client.query(
        `INSERT INTO enrollments (id, course_id, student_id, enrolled_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (course_id, student_id) DO UPDATE SET student_id = EXCLUDED.student_id
         RETURNING id, course_id, student_id, enrolled_at`,
        [uuidv4(), courseId, studentId, new Date().toISOString()]
      );

      const row = result.rows[0];
      enrollments.push({
        id: row.id,
        courseId: row.course_id,
        studentId: row.student_id,
        enrolledAt: row.enrolled_at
      });
    }

    return enrollments;
  });
}

async function listEnrollmentsByCourse(courseId) {
  const result = await query(
    `SELECT
       e.id,
       e.course_id,
       e.student_id,
       e.enrolled_at,
       u.display_name,
       u.email,
       COALESCE(baseline.session_count, 0) AS session_count,
       COALESCE(baseline.is_calibrated, FALSE) AS is_calibrated,
       COALESCE(flags.pending_flags, 0) AS pending_flags
      FROM enrollments e
      JOIN users u ON u.id = e.student_id
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(MAX(sb.session_count), 0) AS session_count,
          COALESCE(BOOL_OR(sb.is_calibrated), FALSE) AS is_calibrated
        FROM student_baselines sb
        WHERE sb.student_id = e.student_id
          AND sb.course_id = e.course_id
      ) baseline ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS pending_flags
        FROM anomaly_flags af
        JOIN writing_sessions ws ON ws.id = af.session_id
        JOIN assignments a ON a.id = ws.assignment_id
        WHERE af.student_id = e.student_id
          AND a.course_id = e.course_id
          AND af.status = 'pending'
      ) flags ON TRUE
      WHERE e.course_id = $1
      ORDER BY e.enrolled_at ASC`,
    [courseId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    courseId: row.course_id,
    studentId: row.student_id,
    enrolledAt: row.enrolled_at,
    sessionCount: Number(row.session_count || 0),
    isCalibrated: row.is_calibrated,
    pendingFlags: Number(row.pending_flags || 0),
    student: {
      id: row.student_id,
      displayName: row.display_name,
      email: row.email
    }
  }));
}

async function findEnrollment(courseId, studentId) {
  const result = await query(
    `SELECT id, course_id, student_id, enrolled_at
     FROM enrollments
     WHERE course_id = $1 AND student_id = $2
     LIMIT 1`,
    [courseId, studentId]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    courseId: row.course_id,
    studentId: row.student_id,
    enrolledAt: row.enrolled_at
  };
}

module.exports = {
  createCourse,
  createEnrollment,
  createEnrollments,
  findCourseById,
  findEnrollment,
  getCourseWithTeacherById,
  listAllCourses,
  listCoursesForStudent,
  listCoursesForTeacher,
  listEnrollmentsByCourse
};
