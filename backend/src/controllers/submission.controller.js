const { submitAssignment } = require("../services/submission.service");

async function createSubmission(req, res, next) {
  try {
    const submission = await submitAssignment({
      user: req.user,
      assignmentId: req.body.assignmentId,
      sessionId: req.body.sessionId,
      contentText: req.body.contentText
    });

    return res.status(201).json({
      message: "Submission created successfully.",
      submission
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createSubmission
};
