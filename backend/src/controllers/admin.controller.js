const {
  createUser,
  editUser,
  listUsers,
  readThresholds,
  updateThresholds
} = require("../services/admin.service");

async function getUsers(req, res, next) {
  try {
    return res.status(200).json({ users: await listUsers() });
  } catch (error) {
    return next(error);
  }
}

async function postUser(req, res, next) {
  try {
    const user = await createUser(req.body);
    return res.status(201).json({ message: "User created successfully.", user });
  } catch (error) {
    return next(error);
  }
}

async function patchUser(req, res, next) {
  try {
    const user = await editUser({
      id: req.params.userId,
      changes: req.body,
      actor: req.user
    });

    return res.status(200).json({ message: "User updated successfully.", user });
  } catch (error) {
    return next(error);
  }
}

async function getThresholds(req, res, next) {
  try {
    return res.status(200).json(await readThresholds());
  } catch (error) {
    return next(error);
  }
}

async function patchThresholds(req, res, next) {
  try {
    return res.status(200).json(await updateThresholds(req.body));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getThresholds,
  getUsers,
  patchThresholds,
  patchUser,
  postUser
};
