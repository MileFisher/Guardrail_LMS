const { addTelemetryPayload, createTelemetrySession } = require("../data/telemetry-session.store");
const { ensureAssignmentAccess } = require("./course.service");
const { generateSessionKey } = require("./hmac.service");

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

module.exports = {
  openTelemetrySession,
  storeTelemetryPayload
};
