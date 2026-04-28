const express = require("express");
const {
  completeSession,
  createSession,
  ingestPayload,
  listBaselines,
  listSessions,
  reprocessSession
} = require("../controllers/telemetry.controller");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const { verifyTelemetrySignature } = require("../middleware/telemetry.middleware");

const router = express.Router();

router.get("/sessions", requireAuth, listSessions);
router.get("/baselines", requireAuth, listBaselines);
router.post("/sessions", requireAuth, requireRole("student"), createSession);
router.post("/sessions/:sessionId/complete", requireAuth, requireRole("student"), completeSession);
router.post("/sessions/:sessionId/reprocess", requireAuth, requireRole("teacher", "admin"), reprocessSession);
router.post("/payloads", requireAuth, requireRole("student"), verifyTelemetrySignature, ingestPayload);

module.exports = router;
