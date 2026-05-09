const {
  createCourse,
  createEnrollments,
  findEnrollment,
  getCourseWithTeacherById,
  listAllCourses,
  listCoursesForStudent,
  listCoursesForTeacher,
  listEnrollmentsByCourse
} = require("../data/course.store");
const { createAssignment, findAssignmentById, listAssignmentsByCourse } = require("../data/assignment.store");
const {
  createLecture,
  deleteLecture,
  findLectureById,
  listLecturesByCourse,
  updateLecture
} = require("../data/lecture.store");
const { listCourseSubmissions } = require("../data/submission.store");
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

function validateLectureInput({ title }, { requireTitle = true } = {}) {
  if (requireTitle && (!title || !String(title).trim())) {
    const error = new Error("title is required.");
    error.statusCode = 400;
    throw error;
  }
}

function normalizeAssignmentType(assignmentType) {
  const normalized = String(assignmentType || "essay").trim().toLowerCase();

  if (!["essay", "qa", "mcq"].includes(normalized)) {
    const error = new Error("assignmentType must be essay, qa, or mcq.");
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function normalizeLectureMediaType(mediaType) {
  const normalized = String(mediaType || "link").trim().toLowerCase();

  if (!["link", "image", "video"].includes(normalized)) {
    const error = new Error("mediaType must be link, image, or video.");
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function isTutorAssignmentType(assignmentType) {
  return ["qa", "mcq"].includes(assignmentType);
}

function sanitizeMcqQuestionsForStudent(mcqQuestions) {
  if (!Array.isArray(mcqQuestions)) {
    return [];
  }

  return mcqQuestions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: Array.isArray(question.options)
      ? question.options.map((option) => ({
          id: option.id,
          text: option.text
        }))
      : []
  }));
}

function sanitizeAssignmentForActor(assignment, actor) {
  if (!assignment || actor?.role !== "student" || assignment.assignmentType !== "mcq") {
    return assignment;
  }

  return {
    ...assignment,
    mcqQuestions: sanitizeMcqQuestionsForStudent(assignment.mcqQuestions)
  };
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

function ensureCourseManager(course, actor, actionLabel) {
  if (actor.role === "student") {
    const error = new Error(`Students cannot ${actionLabel}.`);
    error.statusCode = 403;
    throw error;
  }

  if (actor.role === "teacher" && course.teacherId !== actor.id) {
    const error = new Error(`Only the course teacher can ${actionLabel}.`);
    error.statusCode = 403;
    throw error;
  }
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
  ensureCourseManager(course, actor, "enroll students");

  const uniqueStudentIds = [...new Set(studentIds)];
  await ensureStudentUsers(uniqueStudentIds);
  return createEnrollments(courseId, uniqueStudentIds);
}

async function listCourseEnrollments({ courseId, actor }) {
  await ensureCourseAccess(courseId, actor);
  return listEnrollmentsByCourse(courseId);
}

async function createCourseAssignment({ courseId, actor, assignmentType, title, prompt, mcqQuestions, maxHintLevel, minWordsForHint, zscoreThreshold, pasteThresholdChars, dueAt }) {
  const course = await ensureCourseAccess(courseId, actor);
  ensureCourseManager(course, actor, "create assignments");

  validateAssignmentInput({ title, prompt });
  const normalizedAssignmentType = normalizeAssignmentType(assignmentType);

  return createAssignment({
    courseId,
    createdBy: actor.id,
    assignmentType: normalizedAssignmentType,
    title: title.trim(),
    prompt: prompt.trim(),
    mcqQuestions: normalizedAssignmentType === "mcq" ? mcqQuestions : [],
    maxHintLevel: isTutorAssignmentType(normalizedAssignmentType) ? maxHintLevel : 3,
    minWordsForHint: isTutorAssignmentType(normalizedAssignmentType) ? minWordsForHint : 0,
    zscoreThreshold: normalizedAssignmentType === "essay" ? zscoreThreshold : null,
    pasteThresholdChars: normalizedAssignmentType === "essay" ? pasteThresholdChars : null,
    dueAt
  });
}

async function listCourseAssignments({ courseId, actor }) {
  await ensureCourseAccess(courseId, actor);
  const assignments = await listAssignmentsByCourse(courseId, {
    studentId: actor.role === "student" ? actor.id : null
  });

  return assignments.map((assignment) => sanitizeAssignmentForActor(assignment, actor));
}

async function listCourseSubmissionsForTeacher({ courseId, actor }) {
  const course = await ensureCourseAccess(courseId, actor);
  ensureCourseManager(course, actor, "view submissions");
  return listCourseSubmissions(courseId);
}

async function listCourseLectures({ courseId, actor }) {
  await ensureCourseAccess(courseId, actor);
  return listLecturesByCourse(courseId);
}

async function createCourseLecture({ courseId, actor, title, description, mediaType, mediaUrl }) {
  const course = await ensureCourseAccess(courseId, actor);
  ensureCourseManager(course, actor, "manage lectures");
  validateLectureInput({ title });

  return createLecture({
    courseId,
    createdBy: actor.id,
    title: title.trim(),
    description: String(description || "").trim(),
    mediaType: normalizeLectureMediaType(mediaType),
    mediaUrl: String(mediaUrl || "").trim()
  });
}

async function updateCourseLecture({ courseId, lectureId, actor, title, description, mediaType, mediaUrl }) {
  const course = await ensureCourseAccess(courseId, actor);
  ensureCourseManager(course, actor, "manage lectures");

  const lecture = await findLectureById(lectureId);
  if (!lecture || lecture.courseId !== courseId) {
    const error = new Error("Lecture not found.");
    error.statusCode = 404;
    throw error;
  }

  validateLectureInput({ title }, { requireTitle: false });

  const changes = {};
  if (title !== undefined) {
    changes.title = String(title).trim();
  }
  if (description !== undefined) {
    changes.description = String(description || "").trim();
  }
  if (mediaType !== undefined) {
    changes.mediaType = normalizeLectureMediaType(mediaType);
  }
  if (mediaUrl !== undefined) {
    changes.mediaUrl = String(mediaUrl || "").trim();
  }

  if (Object.prototype.hasOwnProperty.call(changes, "title") && !changes.title) {
    const error = new Error("title is required.");
    error.statusCode = 400;
    throw error;
  }

  return updateLecture(lectureId, changes);
}

async function deleteCourseLectureById({ courseId, lectureId, actor }) {
  const course = await ensureCourseAccess(courseId, actor);
  ensureCourseManager(course, actor, "manage lectures");

  const lecture = await findLectureById(lectureId);
  if (!lecture || lecture.courseId !== courseId) {
    const error = new Error("Lecture not found.");
    error.statusCode = 404;
    throw error;
  }

  return deleteLecture(lectureId);
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
  createCourseLecture,
  createCourseForTeacher,
  deleteCourseLectureById,
  ensureAssignmentAccess,
  ensureCourseAccess,
  enrollStudentsInCourse,
  listCourseAssignments,
  listCourseEnrollments,
  listCourseLectures,
  listCourseSubmissionsForTeacher,
  listCoursesForUser,
  updateCourseLecture
};
