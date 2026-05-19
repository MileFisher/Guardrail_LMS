const express = require("express");
const {
  getOwnLedger,
  getStudentProvenanceTimeline,
  postDeclaration,
  postLectureAccess
} = require("../controllers/provenance.controller");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/declarations", requireAuth, requireRole("student"), postDeclaration);
router.post("/lecture-access", requireAuth, requireRole("student"), postLectureAccess);
router.get("/ledger", requireAuth, requireRole("student"), getOwnLedger);
router.get("/timeline/student/:studentId", requireAuth, requireRole("teacher", "admin"), getStudentProvenanceTimeline);

module.exports = router;
