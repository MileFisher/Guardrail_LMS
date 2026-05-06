const { getPasteTimelineBySessionIds, listFlagsForStudentInCourse, listOwnFlags } = require("../data/anomaly-flag.store");
const { listEnrollmentsByCourse } = require("../data/course.store");
const { findUserById } = require("../data/user.store");
const { ensureCourseAccess } = require("./course.service");

async function listOwnStudentFlags(user) {
  if (user.role !== "student") {
    const error = new Error("Only students can view their own flags.");
    error.statusCode = 403;
    throw error;
  }

  return listOwnFlags(user.id);
}

async function getStudentFlagsForCourse({ studentId, courseId, actor }) {
  if (!courseId) {
    const error = new Error("courseId is required.");
    error.statusCode = 400;
    throw error;
  }

  const course = await ensureCourseAccess(courseId, actor);
  const student = await findUserById(studentId);

  if (!student || student.role !== "student") {
    const error = new Error("Student not found.");
    error.statusCode = 404;
    throw error;
  }

  const flags = await listFlagsForStudentInCourse({ studentId, courseId });
  const pasteTimelineBySessionId = await getPasteTimelineBySessionIds(flags.map((flag) => flag.sessionId));
  const enrollments = await listEnrollmentsByCourse(courseId);
  const enrollment = enrollments.find((item) => item.studentId === studentId);

  return {
    student: {
      id: student.id,
      displayName: student.displayName,
      email: student.email,
      sessionCount: enrollment?.sessionCount || 0,
      isCalibrated: enrollment?.isCalibrated || false
    },
    course: {
      id: course.id,
      title: course.title,
      code: course.code
    },
    flags: flags.map((flag) => ({
      ...flag,
      pasteTimeline: pasteTimelineBySessionId.get(flag.sessionId) || [],
      zScores: {
        wpm: flag.wpmZ,
        paste: flag.pasteZ,
        revision: flag.revisionZ,
        composite: flag.compositeZ
      }
    }))
  };
}

module.exports = {
  getStudentFlagsForCourse,
  listOwnStudentFlags
};
