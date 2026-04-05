const express = require("express");
const {
  acceptCurrentPolicy,
  createPolicy,
  getAllConsentLogs,
  getCurrentPolicy,
  getMyConsentLogs,
  getPolicyHistory
} = require("../controllers/consent.controller");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/policy", getCurrentPolicy);
router.get("/policies", requireAuth, requireRole("admin"), getPolicyHistory);
router.post("/policies", requireAuth, requireRole("admin"), createPolicy);
router.post("/accept", requireAuth, acceptCurrentPolicy);
router.get("/logs/me", requireAuth, getMyConsentLogs);
router.get("/logs", requireAuth, requireRole("admin"), getAllConsentLogs);

module.exports = router;
