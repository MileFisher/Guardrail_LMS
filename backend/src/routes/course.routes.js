const express = require("express");
const {
  createAssignment,
  createCourse,
  enrollStudents,
  getAssignments,
  getCourse,
  getEnrollments,
  listCourses
} = require("../controllers/course.controller");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", requireAuth, listCourses);
router.post("/", requireAuth, requireRole("teacher", "admin"), createCourse);
router.get("/:courseId", requireAuth, getCourse);
router.post("/:courseId/enrollments", requireAuth, requireRole("teacher", "admin"), enrollStudents);
router.get("/:courseId/enrollments", requireAuth, getEnrollments);
router.post("/:courseId/assignments", requireAuth, requireRole("teacher", "admin"), createAssignment);
router.get("/:courseId/assignments", requireAuth, getAssignments);

module.exports = router;
