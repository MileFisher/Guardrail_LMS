const { createSubmission } = require("../data/submission.store");
const { getTelemetrySessionAnalysisContext } = require("../data/telemetry-session.store");
const { ensureAssignmentAccess } = require("./course.service");

async function submitAssignment({ user, assignmentId, sessionId, contentText }) {
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

  return createSubmission({
    assignmentId,
    studentId: user.id,
    sessionId,
    contentText: contentText.trim()
  });
}

module.exports = {
  submitAssignment
};
