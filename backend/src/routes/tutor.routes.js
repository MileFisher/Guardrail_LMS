const express = require("express");
const { closeHintSession, createHint, getStudentLogs, saveMcq } = require("../controllers/tutor.controller");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/hint", requireAuth, requireRole("student"), createHint);
router.post("/hint-limit-reached", requireAuth, requireRole("student"), closeHintSession);
router.post("/mcq-response", requireAuth, requireRole("student"), saveMcq);
router.get("/logs/student/:studentId", requireAuth, requireRole("teacher", "admin"), getStudentLogs);

module.exports = router;
