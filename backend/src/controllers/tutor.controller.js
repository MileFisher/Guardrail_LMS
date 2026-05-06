const {
  getStudentHintLogs,
  markHintLimitReached,
  requestHint
} = require("../services/tutor.service");

async function createHint(req, res, next) {
  try {
    const result = await requestHint({
      user: req.user,
      assignmentId: req.body.assignmentId,
      courseId: req.body.courseId,
      message: req.body.message
    });

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

async function closeHintSession(req, res, next) {
  try {
    return res.status(200).json(await markHintLimitReached({
      user: req.user,
      assignmentId: req.body.assignmentId,
      courseId: req.body.courseId
    }));
  } catch (error) {
    return next(error);
  }
}

async function getStudentLogs(req, res, next) {
  try {
    return res.status(200).json(await getStudentHintLogs({
      actor: req.user,
      studentId: req.params.studentId,
      courseId: req.query.courseId
    }));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  closeHintSession,
  createHint,
  getStudentLogs
};
