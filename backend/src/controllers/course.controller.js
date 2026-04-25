const {
  createCourseAssignment,
  createCourseForTeacher,
  ensureCourseAccess,
  enrollStudentsInCourse,
  listCourseAssignments,
  listCourseEnrollments,
  listCoursesForUser
} = require("../services/course.service");

async function listCourses(req, res, next) {
  try {
    const courses = await listCoursesForUser(req.user);
    return res.status(200).json({ courses });
  } catch (error) {
    return next(error);
  }
}

async function createCourse(req, res, next) {
  try {
    const course = await createCourseForTeacher({
      teacherId: req.user.role === "admin" && req.body.teacherId ? req.body.teacherId : req.user.id,
      title: req.body.title,
      code: req.body.code,
      isActive: req.body.isActive ?? true
    });

    return res.status(201).json({
      message: "Course created successfully.",
      course
    });
  } catch (error) {
    return next(error);
  }
}

async function getCourse(req, res, next) {
  try {
    const course = await ensureCourseAccess(req.params.courseId, req.user);
    return res.status(200).json({ course });
  } catch (error) {
    return next(error);
  }
}

async function enrollStudents(req, res, next) {
  try {
    const enrollments = await enrollStudentsInCourse({
      courseId: req.params.courseId,
      studentIds: req.body.studentIds,
      actor: req.user
    });

    return res.status(201).json({
      message: "Students enrolled successfully.",
      enrollments
    });
  } catch (error) {
    return next(error);
  }
}

async function getEnrollments(req, res, next) {
  try {
    const enrollments = await listCourseEnrollments({
      courseId: req.params.courseId,
      actor: req.user
    });

    return res.status(200).json({ enrollments });
  } catch (error) {
    return next(error);
  }
}

async function createAssignment(req, res, next) {
  try {
    const assignment = await createCourseAssignment({
      courseId: req.params.courseId,
      actor: req.user,
      title: req.body.title,
      prompt: req.body.prompt,
      maxHintLevel: req.body.maxHintLevel,
      minWordsForHint: req.body.minWordsForHint,
      zscoreThreshold: req.body.zscoreThreshold,
      pasteThresholdChars: req.body.pasteThresholdChars,
      dueAt: req.body.dueAt
    });

    return res.status(201).json({
      message: "Assignment created successfully.",
      assignment
    });
  } catch (error) {
    return next(error);
  }
}

async function getAssignments(req, res, next) {
  try {
    const assignments = await listCourseAssignments({
      courseId: req.params.courseId,
      actor: req.user
    });

    return res.status(200).json({ assignments });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createAssignment,
  createCourse,
  enrollStudents,
  getAssignments,
  getCourse,
  getEnrollments,
  listCourses
};
