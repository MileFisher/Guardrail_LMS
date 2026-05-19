const { EVENT_TYPES, EVENT_TYPE_VALUES, SOURCE_TYPES, SOURCE_TYPE_VALUES } = require("../constants/provenance");
const { findAssignmentById } = require("../data/assignment.store");
const { findLectureById } = require("../data/lecture.store");
const {
  addProvenanceEvent,
  listAuditDataset,
  listProvenanceEventsForSession,
  listProvenanceEventsForStudent,
  listProvenanceTimelineForStudent,
  getSubmissionReflectionBySession
} = require("../data/provenance.store");
const { ensureAssignmentAccess, ensureCourseAccess } = require("./course.service");

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildProvenanceAssessment({ timeline, reflection }) {
  const largePasteEvents = timeline.filter((event) => event.eventType === EVENT_TYPES.LARGE_PASTE_DETECTED);
  const declarations = timeline.filter((event) => event.eventType === EVENT_TYPES.SOURCE_DECLARED);
  const lectureAccesses = timeline.filter((event) => event.eventType === EVENT_TYPES.LECTURE_ACCESSED);
  const tutorHints = timeline.filter((event) => event.eventType === EVENT_TYPES.TUTOR_HINT_USED);
  const latestLargePaste = largePasteEvents[largePasteEvents.length - 1] || null;
  const latestDeclaration = declarations[declarations.length - 1] || null;
  const unresolvedLargePaste =
    latestLargePaste &&
    (!latestDeclaration || new Date(latestDeclaration.createdAt).getTime() < new Date(latestLargePaste.createdAt).getTime());

  let score = 70;
  const notes = [];

  if (reflection?.reflectionText?.trim()) {
    score += 15;
  } else {
    score -= 20;
    notes.push("Submission reflection is missing.");
  }

  if ((reflection?.declaredSources || []).length > 0) {
    score += 10;
  } else {
    score -= 10;
    notes.push("No declared AI or material sources were submitted with the reflection.");
  }

  if (declarations.length > 0) {
    score += 10;
  }

  if (lectureAccesses.length > 0) {
    score += 5;
  }

  if (tutorHints.length > 0) {
    score += 5;
  }

  if (unresolvedLargePaste) {
    score -= 35;
    notes.push("A large paste was recorded without a later source declaration.");
  }

  if (
    reflection?.declaredSources?.includes(SOURCE_TYPES.EXTERNAL_AI) &&
    String(reflection?.transformationNotes || "").trim().length < 20
  ) {
    score -= 10;
    notes.push("External AI was declared, but the transformation notes are too brief to explain how the output was changed.");
  }

  const consistencyScore = clampScore(score);
  const consistencyLabel =
    consistencyScore >= 75 ? "well-supported" : consistencyScore >= 45 ? "partially-supported" : "weakly-supported";
  const concernLevel =
    consistencyScore >= 75 ? "lower" : consistencyScore >= 45 ? "moderate" : "higher";

  return {
    consistencyScore,
    consistencyLabel,
    concernLevel,
    notes
  };
}

async function declareSource({
  user,
  assignmentId,
  sessionId,
  sourceType,
  detailText
}) {
  if (user.role !== "student") {
    const error = new Error("Only students can declare provenance sources.");
    error.statusCode = 403;
    throw error;
  }

  if (!SOURCE_TYPE_VALUES.includes(sourceType)) {
    const error = new Error("sourceType is invalid.");
    error.statusCode = 400;
    throw error;
  }

  const assignment = await ensureAssignmentAccess(assignmentId, user);

  return addProvenanceEvent({
    studentId: user.id,
    courseId: assignment.courseId,
    assignmentId: assignment.id,
    sessionId: sessionId || null,
    eventType: EVENT_TYPES.SOURCE_DECLARED,
    sourceType,
    summaryText: `Student declared ${sourceType.replace(/_/g, " ")} as a source.`,
    detailText: String(detailText || "").trim(),
    metadata: {
      sourceType
    },
    createdBy: user.id
  });
}

async function logLectureAccess({
  user,
  courseId,
  lectureId,
  assignmentId = null
}) {
  if (user.role !== "student") {
    const error = new Error("Only students can log lecture access.");
    error.statusCode = 403;
    throw error;
  }

  await ensureCourseAccess(courseId, user);
  const lecture = await findLectureById(lectureId);

  if (!lecture || lecture.courseId !== courseId) {
    const error = new Error("Lecture not found.");
    error.statusCode = 404;
    throw error;
  }

  const assignment = assignmentId ? await ensureAssignmentAccess(assignmentId, user) : null;

  return addProvenanceEvent({
    studentId: user.id,
    courseId,
    assignmentId: assignment?.id || null,
    lectureId,
    eventType: EVENT_TYPES.LECTURE_ACCESSED,
    summaryText: `Lecture material opened: ${lecture.title}.`,
    detailText: lecture.description || "",
    metadata: {
      mediaType: lecture.mediaType,
      mediaUrl: lecture.mediaUrl
    },
    createdBy: user.id
  });
}

async function listOwnLedger(user) {
  if (user.role !== "student") {
    const error = new Error("Only students can view their provenance ledger.");
    error.statusCode = 403;
    throw error;
  }

  return listProvenanceEventsForStudent(user.id);
}

async function getStudentTimeline({
  actor,
  studentId,
  courseId,
  assignmentId = null
}) {
  await ensureCourseAccess(courseId, actor);
  const timeline = await listProvenanceTimelineForStudent({
    studentId,
    courseId,
    assignmentId
  });
  const reflection = assignmentId ? await getSubmissionReflectionBySession(
    timeline.find((event) => event.assignmentId === assignmentId && event.sessionId)?.sessionId || ""
  ) : null;

  return {
    timeline,
    reflection,
    assessment: buildProvenanceAssessment({
      timeline,
      reflection
    })
  };
}

async function getTimelineForSession(sessionId) {
  const timeline = await listProvenanceEventsForSession(sessionId);
  const reflection = await getSubmissionReflectionBySession(sessionId);

  return {
    timeline,
    reflection,
    assessment: buildProvenanceAssessment({
      timeline,
      reflection
    })
  };
}

async function exportAuditDataset() {
  const rows = await listAuditDataset();

  return {
    generatedAt: new Date().toISOString(),
    eventTypes: EVENT_TYPE_VALUES,
    sourceTypes: SOURCE_TYPE_VALUES,
    rowCount: rows.length,
    rows
  };
}

module.exports = {
  EVENT_TYPES,
  SOURCE_TYPES,
  buildProvenanceAssessment,
  declareSource,
  exportAuditDataset,
  getStudentTimeline,
  getTimelineForSession,
  listOwnLedger,
  logLectureAccess
};
