const {
  getFlagWithContext,
  getPasteTimelineBySessionIds,
  listFlagsForStudentInCourse,
  listOwnFlags,
  updateAnomalyFlag
} = require("../data/anomaly-flag.store");
const { listEnrollmentsByCourse } = require("../data/course.store");
const { findUserById } = require("../data/user.store");
const { ensureCourseAccess } = require("./course.service");
const { getTimelineForSession } = require("./provenance.service");

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
  const flagsWithProvenance = await Promise.all(
    flags.map(async (flag) => {
      const provenance = await getTimelineForSession(flag.sessionId);

      return {
        ...flag,
        pasteTimeline: pasteTimelineBySessionId.get(flag.sessionId) || [],
        provenanceTimeline: provenance.timeline,
        provenanceAssessment: provenance.assessment,
        reflection: provenance.reflection,
        zScores: {
          wpm: flag.wpmZ,
          paste: flag.pasteZ,
          revision: flag.revisionZ,
          composite: flag.compositeZ
        }
      };
    })
  );

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
    flags: flagsWithProvenance
  };
}

async function getFlagForActor({ flagId, actor }) {
  const flag = await getFlagWithContext(flagId);

  if (!flag) {
    const error = new Error("Flag not found.");
    error.statusCode = 404;
    throw error;
  }

  if (actor.role === "student" && actor.id !== flag.studentId) {
    const error = new Error("You do not have access to this flag.");
    error.statusCode = 403;
    throw error;
  }

  if (actor.role !== "student") {
    await ensureCourseAccess(flag.courseId, actor);
  }

  const provenance = await getTimelineForSession(flag.sessionId);

  return {
    flag: {
      ...flag,
      zScores: {
        wpm: flag.wpmZ,
        paste: flag.pasteZ,
        revision: flag.revisionZ,
        composite: flag.compositeZ
      }
    },
    appeal: flag.studentAppeal
      ? {
          text: flag.studentAppeal,
          submittedAt: flag.reviewedAt || flag.flaggedAt
        }
      : null,
    sessionData: {
      ...flag.sessionData,
      compositeZ: flag.compositeZ,
      confidencePct: flag.confidencePct
    },
    provenanceTimeline: provenance.timeline,
    provenanceAssessment: provenance.assessment,
    reflection: provenance.reflection
  };
}

async function reviewFlag({ flagId, actor, status, teacherNotes }) {
  if (!["teacher", "admin"].includes(actor.role)) {
    const error = new Error("Only teachers and admins can review flags.");
    error.statusCode = 403;
    throw error;
  }

  if (!["pending", "dismissed", "escalated"].includes(status)) {
    const error = new Error("status must be pending, dismissed, or escalated.");
    error.statusCode = 400;
    throw error;
  }

  const existing = await getFlagWithContext(flagId);
  if (!existing) {
    const error = new Error("Flag not found.");
    error.statusCode = 404;
    throw error;
  }

  await ensureCourseAccess(existing.courseId, actor);

  return updateAnomalyFlag(flagId, {
    status,
    teacherNotes: teacherNotes === undefined ? existing.teacherNotes : String(teacherNotes || "").trim(),
    reviewedAt: ["dismissed", "escalated"].includes(status) ? new Date().toISOString() : null
  });
}

async function appealFlag({ flagId, user, studentAppeal }) {
  if (user.role !== "student") {
    const error = new Error("Only students can submit appeals.");
    error.statusCode = 403;
    throw error;
  }

  const flag = await getFlagWithContext(flagId);
  if (!flag) {
    const error = new Error("Flag not found.");
    error.statusCode = 404;
    throw error;
  }

  if (flag.studentId !== user.id) {
    const error = new Error("This flag does not belong to you.");
    error.statusCode = 403;
    throw error;
  }

  if (!studentAppeal || String(studentAppeal).trim().length < 20) {
    const error = new Error("Please provide at least 20 characters for the appeal.");
    error.statusCode = 400;
    throw error;
  }

  return updateAnomalyFlag(flagId, {
    studentAppeal: String(studentAppeal).trim()
  });
}

module.exports = {
  appealFlag,
  getFlagForActor,
  getStudentFlagsForCourse,
  listOwnStudentFlags,
  reviewFlag
};
