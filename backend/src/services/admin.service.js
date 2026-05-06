const { registerUser, sanitizeUser } = require("./auth.service");
const { getAllUsers, findUserById, updateUser } = require("../data/user.store");
const { getThresholds, saveThresholds } = require("../data/admin.store");

function mapAdminUser(user) {
  const sanitized = sanitizeUser(user);

  return {
    ...sanitized,
    isActive: sanitized.status === "active"
  };
}

async function listUsers() {
  const users = await getAllUsers();
  return users.map(mapAdminUser);
}

async function createUser({ email, password, displayName, role }) {
  if (!email || !password) {
    const error = new Error("email and password are required.");
    error.statusCode = 400;
    throw error;
  }

  if (!["student", "teacher", "admin"].includes(role || "student")) {
    const error = new Error("role must be student, teacher, or admin.");
    error.statusCode = 400;
    throw error;
  }

  const user = await registerUser({ email, password, displayName, role });
  return mapAdminUser(user);
}

async function editUser({ id, changes, actor }) {
  const target = await findUserById(id);

  if (!target) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  if (target.id === actor.id && changes.isActive === false) {
    const error = new Error("You cannot deactivate your own admin account.");
    error.statusCode = 400;
    throw error;
  }

  if (target.role === "admin" && changes.isActive === false) {
    const error = new Error("Admin accounts cannot be deactivated from the UI.");
    error.statusCode = 400;
    throw error;
  }

  const updates = {};

  if (changes.role !== undefined) {
    if (!["student", "teacher", "admin"].includes(changes.role)) {
      const error = new Error("role must be student, teacher, or admin.");
      error.statusCode = 400;
      throw error;
    }
    updates.role = changes.role;
  }

  if (changes.displayName !== undefined) {
    updates.displayName = String(changes.displayName).trim();
  }

  if (changes.isActive !== undefined) {
    updates.status = changes.isActive ? "active" : "inactive";
  }

  const user = await updateUser(id, updates);
  return mapAdminUser(user);
}

async function readThresholds() {
  return getThresholds();
}

async function updateThresholds(input) {
  return saveThresholds(input || {});
}

module.exports = {
  createUser,
  editUser,
  listUsers,
  readThresholds,
  updateThresholds
};
