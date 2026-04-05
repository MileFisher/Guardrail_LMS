const {
  acceptConsent,
  getActivePolicy,
  getAllPolicies,
  getConsentLogs,
  getConsentLogsByUserId,
  publishConsentPolicy
} = require("../services/consent.service");

function getCurrentPolicy(req, res) {
  const policy = getActivePolicy();
  return res.status(200).json({ policy });
}

function getPolicyHistory(req, res) {
  return res.status(200).json({ policies: getAllPolicies() });
}

function createPolicy(req, res, next) {
  try {
    const policy = publishConsentPolicy(req.body);
    return res.status(201).json({
      message: "Consent policy published successfully.",
      policy
    });
  } catch (error) {
    return next(error);
  }
}

function acceptCurrentPolicy(req, res, next) {
  try {
    const consentLog = acceptConsent({
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

function getMyConsentLogs(req, res) {
  return res.status(200).json({
    consentLogs: getConsentLogsByUserId(req.user.id)
  });
}

function getAllConsentLogs(req, res) {
  return res.status(200).json({
    consentLogs: getConsentLogs()
  });
}

module.exports = {
  acceptCurrentPolicy,
  createPolicy,
  getAllConsentLogs,
  getCurrentPolicy,
  getMyConsentLogs,
  getPolicyHistory
};
