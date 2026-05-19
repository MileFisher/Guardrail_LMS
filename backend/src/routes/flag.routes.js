const express = require("express");
const {
  getFlag,
  getOwnFlags,
  getStudentFlags,
  patchAppeal,
  patchFlag
} = require("../controllers/flag.controller");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/me", requireAuth, requireRole("student"), getOwnFlags);
router.get("/student/:studentId", requireAuth, requireRole("teacher", "admin"), getStudentFlags);
router.get("/:flagId", requireAuth, getFlag);
router.patch("/:flagId", requireAuth, requireRole("teacher", "admin"), patchFlag);
router.patch("/:flagId/appeal", requireAuth, requireRole("student"), patchAppeal);

module.exports = router;
