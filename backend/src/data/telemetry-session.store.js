const { v4: uuidv4 } = require("uuid");

const telemetrySessions = [];

function createTelemetrySession({ assignmentId, userId, deviceType, screenResolution, hmacKey }) {
  const session = {
    id: uuidv4(),
    assignmentId,
    userId,
    deviceType: deviceType || "laptop",
    screenResolution: screenResolution || "unknown",
    hmacKey,
    status: "active",
    createdAt: new Date().toISOString(),
    payloads: []
  };

  telemetrySessions.push(session);
  return session;
}

function getTelemetrySessionById(id) {
  return telemetrySessions.find((session) => session.id === id) || null;
}

function addTelemetryPayload(sessionId, payload) {
  const session = getTelemetrySessionById(sessionId);

  if (!session) {
    return null;
  }

  session.payloads.push(payload);
  return session;
}

module.exports = {
  addTelemetryPayload,
  createTelemetrySession,
  getTelemetrySessionById
};
