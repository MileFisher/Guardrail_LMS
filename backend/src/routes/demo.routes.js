const express = require("express");
const { getAdminDashboard, getTeacherDashboard } = require("../controllers/demo.controller");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/admin", requireAuth, requireRole("admin"), getAdminDashboard);
router.get("/teacher", requireAuth, requireRole("teacher", "admin"), getTeacherDashboard);

module.exports = router;
