const { createSubmission } = require("../data/submission.store");
const { getTelemetrySessionAnalysisContext } = require("../data/telemetry-session.store");
const { ensureAssignmentAccess } = require("./course.service");
const {
  addProvenanceEvent,
  countLargePasteEventsWithoutDeclaration,
  upsertSubmissionReflection
} = require("../data/provenance.store");
const { EVENT_TYPES, SOURCE_TYPE_VALUES } = require("../constants/provenance");

async function submitAssignment({
  user,
  assignmentId,
  sessionId,
  contentText,
  declaredSources,
  reflectionText,
  transformationNotes
}) {
  if (user.role !== "student") {
    const error = new Error("Only students can submit assignments.");
    error.statusCode = 403;
    throw error;
  }

  if (!assignmentId || !sessionId) {
    const error = new Error("assignmentId and sessionId are required.");
    error.statusCode = 400;
    throw error;
  }

  if (!contentText || !contentText.trim()) {
    const error = new Error("Submission content is required.");
    error.statusCode = 400;
    throw error;
  }

  const normalizedSources = Array.isArray(declaredSources)
    ? declaredSources.filter((source) => SOURCE_TYPE_VALUES.includes(source))
    : [];

  if (normalizedSources.length === 0) {
    const error = new Error("Please declare at least one source before submission.");
    error.statusCode = 400;
    throw error;
  }

  if (!reflectionText || String(reflectionText).trim().length < 20) {
    const error = new Error("Please provide a short reflection of at least 20 characters before submission.");
    error.statusCode = 400;
    throw error;
  }

  const assignment = await ensureAssignmentAccess(assignmentId, user);

  if (assignment.assignmentType !== "essay") {
    const error = new Error("Only essay assignments can be submitted through the Integrity Monitor.");
    error.statusCode = 409;
    throw error;
  }

  const session = await getTelemetrySessionAnalysisContext(sessionId);
  if (!session || session.assignmentId !== assignmentId || session.userId !== user.id) {
    const error = new Error("Telemetry session does not match this submission.");
    error.statusCode = 400;
    throw error;
  }

  const missingDeclarationCount = await countLargePasteEventsWithoutDeclaration(sessionId);
  if (missingDeclarationCount > 0) {
    const error = new Error("Please declare the source of the pasted material before submission.");
    error.statusCode = 409;
    throw error;
  }

  const submission = await createSubmission({
    assignmentId,
    studentId: user.id,
    sessionId,
    contentText: contentText.trim()
  });

  const reflection = await upsertSubmissionReflection({
    submissionId: submission.id,
    assignmentId,
    studentId: user.id,
    sessionId,
    declaredSources: normalizedSources,
    reflectionText: String(reflectionText || "").trim(),
    transformationNotes: String(transformationNotes || "").trim()
  });

  await addProvenanceEvent({
    studentId: user.id,
    courseId: assignment.courseId,
    assignmentId,
    sessionId,
    submissionId: submission.id,
    eventType: EVENT_TYPES.SUBMISSION_REFLECTION,
    summaryText: "Submission reflection recorded for ethical AI provenance review.",
    detailText: reflection.reflectionText,
    metadata: {
      declaredSources: reflection.declaredSources,
      transformationNotes: reflection.transformationNotes
    },
    createdBy: user.id
  });

  return {
    ...submission,
    reflection
  };
}

module.exports = {
  submitAssignment
};
