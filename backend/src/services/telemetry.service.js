const {
  addTelemetryPayload,
  createTelemetrySession,
  getTelemetrySessionAnalysisContext,
  listTelemetrySessionsByStudent,
  markTelemetrySessionCompleted
} = require("../data/telemetry-session.store");
const { listBaselinesByStudent } = require("../data/student-baseline.store");
const { ensureAssignmentAccess } = require("./course.service");
const { generateSessionKey } = require("./hmac.service");
const { enqueueSessionAnalysis } = require("./session-analytics.service");

async function openTelemetrySession({ assignmentId, userId, deviceType, screenResolution }) {
  await ensureAssignmentAccess(assignmentId, {
    id: userId,
    role: "student"
  });

  const hmacKey = generateSessionKey();

  return createTelemetrySession({
    assignmentId,
    userId,
    deviceType,
    screenResolution,
    hmacKey
  });
}

async function storeTelemetryPayload({ sessionId, rawBody, body }) {
  return addTelemetryPayload(sessionId, {
    receivedAt: new Date().toISOString(),
    rawBody,
    body
  });
}

async function listOwnTelemetrySessions(user) {
  if (user.role !== "student") {
    const error = new Error("Only students can view telemetry sessions.");
    error.statusCode = 403;
    throw error;
  }

  const sessions = await listTelemetrySessionsByStudent(user.id);
  return sessions.map(({ hmacKey, ...session }) => session);
}

async function listOwnBaselines(user) {
  if (user.role !== "student") {
    const error = new Error("Only students can view telemetry baselines.");
    error.statusCode = 403;
    throw error;
  }

  return listBaselinesByStudent(user.id);
}

async function completeTelemetrySession({ sessionId, user }) {
  const session = await getTelemetrySessionAnalysisContext(sessionId);

  if (!session) {
    const error = new Error("Telemetry session not found.");
    error.statusCode = 404;
    throw error;
  }

  if (session.userId !== user.id) {
    const error = new Error("This telemetry session does not belong to you.");
    error.statusCode = 403;
    throw error;
  }

  const completedSession = await markTelemetrySessionCompleted(sessionId, new Date().toISOString());

  if (!completedSession) {
    const error = new Error("Telemetry session not found.");
    error.statusCode = 404;
    throw error;
  }

  enqueueSessionAnalysis(sessionId);
  return completedSession;
}

async function reprocessTelemetrySession({ sessionId, actor }) {
  const session = await getTelemetrySessionAnalysisContext(sessionId);

  if (!session) {
    const error = new Error("Telemetry session not found.");
    error.statusCode = 404;
    throw error;
  }

  await ensureAssignmentAccess(session.assignmentId, actor);

  if (!["completed", "submitted"].includes(session.status)) {
    const error = new Error("Only completed telemetry sessions can be reprocessed.");
    error.statusCode = 409;
    throw error;
  }

  enqueueSessionAnalysis(sessionId);
  return session;
}

module.exports = {
  completeTelemetrySession,
  listOwnBaselines,
  listOwnTelemetrySessions,
  openTelemetrySession,
  reprocessTelemetrySession,
  storeTelemetryPayload
};
