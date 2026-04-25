const { openTelemetrySession, storeTelemetryPayload } = require("../services/telemetry.service");

async function createSession(req, res, next) {
  try {
    const { assignmentId, deviceType, screenResolution } = req.body;

    if (!assignmentId) {
      const error = new Error("assignmentId is required.");
      error.statusCode = 400;
      throw error;
    }

    const session = await openTelemetrySession({
      assignmentId,
      userId: req.user.id,
      deviceType,
      screenResolution
    });

    return res.status(201).json({
      message: "Telemetry session created successfully.",
      session: {
        id: session.id,
        assignmentId: session.assignmentId,
        deviceType: session.deviceType,
        screenResolution: session.screenResolution,
        status: session.status,
        createdAt: session.createdAt,
        hmacKey: session.hmacKey
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function ingestPayload(req, res, next) {
  try {
    const session = await storeTelemetryPayload({
      sessionId: req.body.sessionId,
      rawBody: req.rawBody,
      body: req.body
    });

    if (!session) {
      const error = new Error("Telemetry session not found.");
      error.statusCode = 404;
      throw error;
    }

    return res.status(202).json({
      message: "Telemetry payload accepted.",
      sessionId: session.id,
      totalPayloads: session.payloadCount
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createSession,
  ingestPayload
};
