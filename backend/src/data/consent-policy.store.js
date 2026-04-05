const { v4: uuidv4 } = require("uuid");

const now = new Date().toISOString();
const policies = [
  {
    id: uuidv4(),
    version: "v1",
    contentMarkdown: "By using Guardrail LMS, you consent to keystroke timing telemetry collection during monitored writing sessions.",
    isActive: true,
    publishedAt: now
  }
];

function getAllPolicies() {
  return policies;
}

function getActivePolicy() {
  return policies.find((policy) => policy.isActive) || null;
}

function getPolicyByVersion(version) {
  return policies.find((policy) => policy.version === version) || null;
}

function addPolicy({ version, contentMarkdown }) {
  policies.forEach((policy) => {
    policy.isActive = false;
  });

  const policy = {
    id: uuidv4(),
    version,
    contentMarkdown,
    isActive: true,
    publishedAt: new Date().toISOString()
  };

  policies.push(policy);
  return policy;
}

module.exports = {
  addPolicy,
  getActivePolicy,
  getAllPolicies,
  getPolicyByVersion
};
