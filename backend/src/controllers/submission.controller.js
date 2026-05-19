const { submitAssignment } = require("../services/submission.service");

async function createSubmission(req, res, next) {
  try {
    const submission = await submitAssignment({
      user: req.user,
      assignmentId: req.body.assignmentId,
      sessionId: req.body.sessionId,
      contentText: req.body.contentText,
      declaredSources: req.body.declaredSources,
      reflectionText: req.body.reflectionText,
      transformationNotes: req.body.transformationNotes
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
