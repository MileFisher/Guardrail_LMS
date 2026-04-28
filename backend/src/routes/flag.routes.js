const express = require("express");
const { getOwnFlags, getStudentFlags } = require("../controllers/flag.controller");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/me", requireAuth, requireRole("student"), getOwnFlags);
router.get("/student/:studentId", requireAuth, requireRole("teacher", "admin"), getStudentFlags);

module.exports = router;
