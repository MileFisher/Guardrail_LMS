const express = require("express");
const { createSubmission } = require("../controllers/submission.controller");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", requireAuth, requireRole("student"), createSubmission);

module.exports = router;
