const { getTelemetrySessionById } = require("../data/telemetry-session.store");
const { generateHmacDigest, signaturesMatch } = require("../services/hmac.service");

async function verifyTelemetrySignature(req, res, next) {
  try {
    const signature = req.headers["x-telemetry-signature"];
    const { sessionId } = req.body;

    if (!signature) {
      return res.status(401).json({ message: "Missing telemetry signature." });
    }

    if (!sessionId) {
      return res.status(400).json({ message: "sessionId is required." });
    }

    const session = await getTelemetrySessionById(sessionId);

    if (!session) {
      return res.status(401).json({ message: "Invalid telemetry session." });
    }

    if (session.userId !== req.user.id) {
      return res.status(403).json({ message: "This telemetry session does not belong to you." });
    }

    const expectedSignature = generateHmacDigest(req.rawBody || "", session.hmacKey);

    if (!signaturesMatch(signature, expectedSignature)) {
      return res.status(401).json({ message: "Invalid telemetry signature." });
    }

    req.telemetrySession = session;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  verifyTelemetrySignature
};
