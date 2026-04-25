const { findUserById } = require("../data/user.store");
const { verifyAccessToken } = require("../services/token.service");

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header." });
  }

  const token = authHeader.slice("Bearer ".length);

  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  try {
    const user = await findUserById(payload.sub);

    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

function requireRole(...allowedRoles) {
  return function checkRole(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication is required." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to access this resource." });
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole
};
