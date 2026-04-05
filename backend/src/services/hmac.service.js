const crypto = require("crypto");

function generateSessionKey() {
  return crypto.randomBytes(32).toString("hex");
}

function generateHmacDigest(rawBody, key) {
  return crypto.createHmac("sha256", key).update(rawBody).digest("hex");
}

function signaturesMatch(providedSignature, expectedSignature) {
  const normalizedProvided = (providedSignature || "").replace(/^sha256=/i, "");

  if (!normalizedProvided || normalizedProvided.length !== expectedSignature.length) {
    return false;
  }

  const providedBuffer = Buffer.from(normalizedProvided, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

module.exports = {
  generateHmacDigest,
  generateSessionKey,
  signaturesMatch
};
