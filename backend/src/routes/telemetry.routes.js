const express = require("express");
const { createSession, ingestPayload } = require("../controllers/telemetry.controller");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const { verifyTelemetrySignature } = require("../middleware/telemetry.middleware");

const router = express.Router();

router.post("/sessions", requireAuth, requireRole("student"), createSession);
router.post("/payloads", requireAuth, requireRole("student"), verifyTelemetrySignature, ingestPayload);

module.exports = router;
