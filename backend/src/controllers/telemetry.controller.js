const {
  completeTelemetrySession,
  listOwnBaselines,
  listOwnTelemetrySessions,
  openTelemetrySession,
  reprocessTelemetrySession,
  storeTelemetryPayload
} = require("../services/telemetry.service");

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

async function listSessions(req, res, next) {
  try {
    if (req.query.mine !== "true") {
      const error = new Error("Only mine=true is supported.");
      error.statusCode = 400;
      throw error;
    }

    const sessions = await listOwnTelemetrySessions(req.user);
    return res.status(200).json({ sessions });
  } catch (error) {
    return next(error);
  }
}

async function listBaselines(req, res, next) {
  try {
    if (req.query.mine !== "true") {
      const error = new Error("Only mine=true is supported.");
      error.statusCode = 400;
      throw error;
    }

    const baselines = await listOwnBaselines(req.user);
    return res.status(200).json({ baselines });
  } catch (error) {
    return next(error);
  }
}

async function completeSession(req, res, next) {
  try {
    const session = await completeTelemetrySession({
      sessionId: req.params.sessionId,
      user: req.user
    });

    return res.status(202).json({
      message: "Telemetry session completed. Analysis queued.",
      sessionId: session.id,
      status: session.status
    });
  } catch (error) {
    return next(error);
  }
}

async function reprocessSession(req, res, next) {
  try {
    const session = await reprocessTelemetrySession({
      sessionId: req.params.sessionId,
      actor: req.user
    });

    return res.status(202).json({
      message: "Telemetry session analysis queued.",
      sessionId: session.id,
      status: session.status
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  completeSession,
  createSession,
  ingestPayload,
  listBaselines,
  listSessions,
  reprocessSession
};
