const { addTelemetryPayload, createTelemetrySession } = require("../data/telemetry-session.store");
const { generateSessionKey } = require("./hmac.service");

function openTelemetrySession({ assignmentId, userId, deviceType, screenResolution }) {
  const hmacKey = generateSessionKey();

  return createTelemetrySession({
    assignmentId,
    userId,
    deviceType,
    screenResolution,
    hmacKey
  });
}

function storeTelemetryPayload({ sessionId, rawBody, body }) {
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
