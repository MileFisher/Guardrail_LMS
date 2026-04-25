const {
  createCourse,
  createEnrollments,
  findCourseById,
  findEnrollment,
  getCourseWithTeacherById,
  listAllCourses,
  listCoursesForStudent,
  listCoursesForTeacher,
  listEnrollmentsByCourse
} = require("../data/course.store");
const { createAssignment, findAssignmentById, listAssignmentsByCourse } = require("../data/assignment.store");
const { findUserById } = require("../data/user.store");

function validateCourseInput({ title, code }) {
  if (!title || !code) {
    const error = new Error("title and code are required.");
    error.statusCode = 400;
    throw error;
  }
}

function validateAssignmentInput({ title, prompt }) {
  if (!title || !prompt) {
    const error = new Error("title and prompt are required.");
    error.statusCode = 400;
    throw error;
  }
}

async function ensureTeacherUser(userId) {
  const user = await findUserById(userId);

  if (!user) {
    const error = new Error("Teacher user not found.");
    error.statusCode = 404;
    throw error;
  }

  if (!["teacher", "admin"].includes(user.role)) {
    const error = new Error("Only teacher or admin users can own a course.");
    error.statusCode = 400;
    throw error;
  }

  return user;
}

async function ensureStudentUsers(studentIds) {
  const users = await Promise.all(studentIds.map((studentId) => findUserById(studentId)));
  const missingUser = users.find((user) => !user);

  if (missingUser === undefined && users.every((user) => user.role === "student")) {
    return users;
  }

  if (users.some((user) => !user)) {
    const error = new Error("One or more student users do not exist.");
    error.statusCode = 404;
    throw error;
  }

  const error = new Error("Enrollments can only be created for student users.");
  error.statusCode = 400;
  throw error;
}

async function ensureCourseAccess(courseId, user) {
  const course = await getCourseWithTeacherById(courseId);

  if (!course) {
    const error = new Error("Course not found.");
    error.statusCode = 404;
    throw error;
  }

  if (user.role === "admin") {
    return course;
  }

  if (user.role === "teacher" && course.teacherId === user.id) {
    return course;
  }

  if (user.role === "student") {
    const enrollment = await findEnrollment(courseId, user.id);

    if (enrollment) {
      return course;
    }
  }

  const error = new Error("You do not have access to this course.");
  error.statusCode = 403;
  throw error;
}

async function createCourseForTeacher({ teacherId, title, code, isActive }) {
  validateCourseInput({ title, code });
  await ensureTeacherUser(teacherId);
  return createCourse({ teacherId, title: title.trim(), code: code.trim(), isActive });
}

async function listCoursesForUser(user) {
  if (user.role === "admin") {
    return listAllCourses();
  }

  if (user.role === "student") {
    return listCoursesForStudent(user.id);
  }

  return listCoursesForTeacher(user.id);
}

async function enrollStudentsInCourse({ courseId, studentIds, actor }) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    const error = new Error("studentIds must be a non-empty array.");
    error.statusCode = 400;
    throw error;
  }

  const course = await ensureCourseAccess(courseId, actor);

  if (actor.role === "teacher" && course.teacherId !== actor.id) {
    const error = new Error("Only the course teacher can enroll students.");
    error.statusCode = 403;
    throw error;
  }

  const uniqueStudentIds = [...new Set(studentIds)];
  await ensureStudentUsers(uniqueStudentIds);
  return createEnrollments(courseId, uniqueStudentIds);
}

async function listCourseEnrollments({ courseId, actor }) {
  await ensureCourseAccess(courseId, actor);
  return listEnrollmentsByCourse(courseId);
}

async function createCourseAssignment({ courseId, actor, title, prompt, maxHintLevel, minWordsForHint, zscoreThreshold, pasteThresholdChars, dueAt }) {
  const course = await ensureCourseAccess(courseId, actor);

  if (actor.role === "student") {
    const error = new Error("Students cannot create assignments.");
    error.statusCode = 403;
    throw error;
  }

  if (actor.role === "teacher" && course.teacherId !== actor.id) {
    const error = new Error("Only the course teacher can create assignments.");
    error.statusCode = 403;
    throw error;
  }

  validateAssignmentInput({ title, prompt });

  return createAssignment({
    courseId,
    createdBy: actor.id,
    title: title.trim(),
    prompt: prompt.trim(),
    maxHintLevel,
    minWordsForHint,
    zscoreThreshold,
    pasteThresholdChars,
    dueAt
  });
}

async function listCourseAssignments({ courseId, actor }) {
  await ensureCourseAccess(courseId, actor);
  return listAssignmentsByCourse(courseId);
}

async function ensureAssignmentAccess(assignmentId, actor) {
  const assignment = await findAssignmentById(assignmentId);

  if (!assignment) {
    const error = new Error("Assignment not found.");
    error.statusCode = 404;
    throw error;
  }

  await ensureCourseAccess(assignment.courseId, actor);
  return assignment;
}

module.exports = {
  createCourseAssignment,
  createCourseForTeacher,
  ensureAssignmentAccess,
  ensureCourseAccess,
  enrollStudentsInCourse,
  listCourseAssignments,
  listCourseEnrollments,
  listCoursesForUser
};
