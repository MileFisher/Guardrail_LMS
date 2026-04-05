function getAdminDashboard(req, res) {
  return res.status(200).json({
    message: "Admin route accessed successfully.",
    user: req.user
  });
}

function getTeacherDashboard(req, res) {
  return res.status(200).json({
    message: "Teacher route accessed successfully.",
    user: req.user
  });
}

module.exports = {
  getAdminDashboard,
  getTeacherDashboard
};
