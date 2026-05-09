const express = require("express");
const {
  createAssignment,
  createCourse,
  createLecture,
  editLecture,
  enrollStudents,
  getAssignments,
  getCourse,
  getEnrollments,
  getLectures,
  getSubmissions,
  listCourses,
  removeLecture
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
router.get("/:courseId/submissions", requireAuth, requireRole("teacher", "admin"), getSubmissions);
router.post("/:courseId/lectures", requireAuth, requireRole("teacher", "admin"), createLecture);
router.get("/:courseId/lectures", requireAuth, getLectures);
router.patch("/:courseId/lectures/:lectureId", requireAuth, requireRole("teacher", "admin"), editLecture);
router.delete("/:courseId/lectures/:lectureId", requireAuth, requireRole("teacher", "admin"), removeLecture);

module.exports = router;
