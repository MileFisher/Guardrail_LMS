const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const env = require("../config/env");
const { addUser, findUserByEmail, touchUser } = require("../data/user.store");

async function registerUser({ email, password, displayName, role }) {
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    const error = new Error("Email is already registered.");
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, env.bcryptRounds);
  const now = new Date().toISOString();

  const user = await addUser({
    id: uuidv4(),
    email: normalizedEmail,
    passwordHash,
    role: role || "student",
    displayName: displayName?.trim() || normalizedEmail.split("@")[0],
    status: "active",
    createdAt: now,
    updatedAt: now
  });

  return user;
}

async function loginUser({ email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    const error = new Error("Invalid email or password.");
    error.statusCode = 401;
    throw error;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    const error = new Error("Invalid email or password.");
    error.statusCode = 401;
    throw error;
  }

  return touchUser(user.id, new Date().toISOString());
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

module.exports = {
  loginUser,
  registerUser,
  sanitizeUser
};
