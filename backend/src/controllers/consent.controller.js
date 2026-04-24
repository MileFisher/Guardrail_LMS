const {
  acceptConsent,
  getActivePolicy,
  getAllPolicies,
  getConsentLogs,
  getConsentLogsByUserId,
  publishConsentPolicy
} = require("../services/consent.service");

async function getCurrentPolicy(req, res, next) {
  try {
    const policy = await getActivePolicy();
    return res.status(200).json({ policy });
  } catch (error) {
    return next(error);
  }
}

async function getPolicyHistory(req, res, next) {
  try {
    return res.status(200).json({ policies: await getAllPolicies() });
  } catch (error) {
    return next(error);
  }
}

async function createPolicy(req, res, next) {
  try {
    const policy = await publishConsentPolicy(req.body);
    return res.status(201).json({
      message: "Consent policy published successfully.",
      policy
    });
  } catch (error) {
    return next(error);
  }
}

async function acceptCurrentPolicy(req, res, next) {
  try {
    const consentLog = await acceptConsent({
      userId: req.user.id,
      policyVersion: req.body.policyVersion
    });

    return res.status(201).json({
      message: "Consent recorded successfully.",
      consentLog
    });
  } catch (error) {
    return next(error);
  }
}

async function getMyConsentLogs(req, res, next) {
  try {
    return res.status(200).json({
      consentLogs: await getConsentLogsByUserId(req.user.id)
    });
  } catch (error) {
    return next(error);
  }
}

async function getAllConsentLogs(req, res, next) {
  try {
    return res.status(200).json({
      consentLogs: await getConsentLogs()
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  acceptCurrentPolicy,
  createPolicy,
  getAllConsentLogs,
  getCurrentPolicy,
  getMyConsentLogs,
  getPolicyHistory
};
