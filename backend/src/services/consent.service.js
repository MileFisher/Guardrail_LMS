const { addConsentLog, getConsentLogs, getConsentLogsByUserId } = require("../data/consent-log.store");
const {
  addPolicy,
  getActivePolicy,
  getAllPolicies,
  getPolicyByVersion
} = require("../data/consent-policy.store");

async function publishConsentPolicy({ version, contentMarkdown }) {
  if (!version || !contentMarkdown) {
    const error = new Error("Version and contentMarkdown are required.");
    error.statusCode = 400;
    throw error;
  }

  if (await getPolicyByVersion(version)) {
    const error = new Error("A consent policy with that version already exists.");
    error.statusCode = 409;
    throw error;
  }

  return addPolicy({ version, contentMarkdown });
}

async function acceptConsent({ userId, policyVersion }) {
  const policy = policyVersion ? await getPolicyByVersion(policyVersion) : await getActivePolicy();

  if (!policy) {
    const error = new Error("Consent policy not found.");
    error.statusCode = 404;
    throw error;
  }

  return addConsentLog({
    userId,
    policyVersion: policy.version,
    acceptedAt: new Date().toISOString()
  });
}

module.exports = {
  acceptConsent,
  getActivePolicy,
  getAllPolicies,
  getConsentLogs,
  getConsentLogsByUserId,
  publishConsentPolicy
};
