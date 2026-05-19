const {
  appealFlag,
  getFlagForActor,
  getStudentFlagsForCourse,
  listOwnStudentFlags,
  reviewFlag
} = require("../services/flag.service");

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

async function getFlag(req, res, next) {
  try {
    return res.status(200).json(await getFlagForActor({
      flagId: req.params.flagId,
      actor: req.user
    }));
  } catch (error) {
    return next(error);
  }
}

async function patchFlag(req, res, next) {
  try {
    const flag = await reviewFlag({
      flagId: req.params.flagId,
      actor: req.user,
      status: req.body.status,
      teacherNotes: req.body.teacherNotes
    });

    return res.status(200).json({
      message: "Flag updated successfully.",
      flag
    });
  } catch (error) {
    return next(error);
  }
}

async function patchAppeal(req, res, next) {
  try {
    const flag = await appealFlag({
      flagId: req.params.flagId,
      user: req.user,
      studentAppeal: req.body.studentAppeal
    });

    return res.status(200).json({
      message: "Appeal submitted successfully.",
      flag
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getFlag,
  getOwnFlags,
  getStudentFlags,
  patchAppeal,
  patchFlag
};
