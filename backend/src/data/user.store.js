const users = [];

function getAllUsers() {
  return users;
}

function findUserByEmail(email) {
  return users.find((user) => user.email === email.toLowerCase());
}

function findUserById(id) {
  return users.find((user) => user.id === id);
}

function addUser(user) {
  users.push(user);
  return user;
}

module.exports = {
  addUser,
  findUserByEmail,
  findUserById,
  getAllUsers
};
