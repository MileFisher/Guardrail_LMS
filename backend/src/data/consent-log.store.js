const { v4: uuidv4 } = require("uuid");

const consentLogs = [];

function addConsentLog({ userId, policyVersion, acceptedAt }) {
  const consentLog = {
    id: uuidv4(),
    userId,
    policyVersion,
    accepted: true,
    acceptedAt
  };

  consentLogs.push(consentLog);
  return consentLog;
}

function getConsentLogs() {
  return consentLogs;
}

function getConsentLogsByUserId(userId) {
  return consentLogs.filter((log) => log.userId === userId);
}

module.exports = {
  addConsentLog,
  getConsentLogs,
  getConsentLogsByUserId
};
