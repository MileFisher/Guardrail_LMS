const { query } = require("../db");

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    displayName: row.display_name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getAllUsers() {
  const result = await query(
    `SELECT id, email, password_hash, role, display_name, status, created_at, updated_at
     FROM users
     ORDER BY created_at DESC`
  );

  return result.rows.map(mapUser);
}

async function findUserByEmail(email) {
  const result = await query(
    `SELECT id, email, password_hash, role, display_name, status, created_at, updated_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email.toLowerCase()]
  );

  return mapUser(result.rows[0]);
}

async function findUserById(id) {
  const result = await query(
    `SELECT id, email, password_hash, role, display_name, status, created_at, updated_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  return mapUser(result.rows[0]);
}

async function addUser(user) {
  const result = await query(
    `INSERT INTO users (id, email, password_hash, role, display_name, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, email, password_hash, role, display_name, status, created_at, updated_at`,
    [
      user.id,
      user.email,
      user.passwordHash,
      user.role,
      user.displayName,
      user.status,
      user.createdAt,
      user.updatedAt
    ]
  );

  return mapUser(result.rows[0]);
}

async function touchUser(id, updatedAt) {
  const result = await query(
    `UPDATE users
     SET updated_at = $2
     WHERE id = $1
     RETURNING id, email, password_hash, role, display_name, status, created_at, updated_at`,
    [id, updatedAt]
  );

  return mapUser(result.rows[0]);
}

module.exports = {
  addUser,
  findUserByEmail,
  findUserById,
  getAllUsers,
  touchUser
};
