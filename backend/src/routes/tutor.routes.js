const express = require("express");
const { closeHintSession, createHint, getStudentLogs } = require("../controllers/tutor.controller");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/hint", requireAuth, requireRole("student"), createHint);
router.post("/hint-limit-reached", requireAuth, requireRole("student"), closeHintSession);
router.get("/logs/student/:studentId", requireAuth, requireRole("teacher", "admin"), getStudentLogs);

module.exports = router;
