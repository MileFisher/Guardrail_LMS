const {
  declareSource,
  exportAuditDataset,
  getStudentTimeline,
  listOwnLedger,
  logLectureAccess
} = require("../services/provenance.service");

async function postDeclaration(req, res, next) {
  try {
    const event = await declareSource({
      user: req.user,
      assignmentId: req.body.assignmentId,
      sessionId: req.body.sessionId,
      sourceType: req.body.sourceType,
      detailText: req.body.detailText
    });

    return res.status(201).json({
      message: "Source declaration recorded.",
      event
    });
  } catch (error) {
    return next(error);
  }
}

async function postLectureAccess(req, res, next) {
  try {
    const event = await logLectureAccess({
      user: req.user,
      courseId: req.body.courseId,
      lectureId: req.body.lectureId,
      assignmentId: req.body.assignmentId
    });

    return res.status(201).json({
      message: "Lecture access recorded.",
      event
    });
  } catch (error) {
    return next(error);
  }
}

async function getOwnLedger(req, res, next) {
  try {
    if (req.query.mine !== "true") {
      const error = new Error("Only mine=true is supported.");
      error.statusCode = 400;
      throw error;
    }

    return res.status(200).json({
      ledger: await listOwnLedger(req.user)
    });
  } catch (error) {
    return next(error);
  }
}

async function getStudentProvenanceTimeline(req, res, next) {
  try {
    return res.status(200).json(await getStudentTimeline({
      actor: req.user,
      studentId: req.params.studentId,
      courseId: req.query.courseId,
      assignmentId: req.query.assignmentId || null
    }));
  } catch (error) {
    return next(error);
  }
}

async function getAuditDataset(req, res, next) {
  try {
    return res.status(200).json(await exportAuditDataset());
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAuditDataset,
  getOwnLedger,
  getStudentProvenanceTimeline,
  postDeclaration,
  postLectureAccess
};
