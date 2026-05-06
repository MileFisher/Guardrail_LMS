const { getStudentFlagsForCourse, listOwnStudentFlags } = require("../services/flag.service");

async function getOwnFlags(req, res, next) {
  try {
    const flags = await listOwnStudentFlags(req.user);
    return res.status(200).json({ flags });
  } catch (error) {
    return next(error);
  }
}

async function getStudentFlags(req, res, next) {
  try {
    const result = await getStudentFlagsForCourse({
      studentId: req.params.studentId,
      courseId: req.query.courseId,
      actor: req.user
    });

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getOwnFlags,
  getStudentFlags
};
