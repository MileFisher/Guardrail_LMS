const express = require("express");
const {
  getThresholds,
  getUsers,
  patchThresholds,
  patchUser,
  postUser
} = require("../controllers/admin.controller");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth, requireRole("admin"));
router.get("/users", getUsers);
router.post("/users", postUser);
router.patch("/users/:userId", patchUser);
router.get("/thresholds", getThresholds);
router.patch("/thresholds", patchThresholds);

module.exports = router;
