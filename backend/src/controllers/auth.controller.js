const { loginUser, registerUser, sanitizeUser } = require("../services/auth.service");
const { signAccessToken } = require("../services/token.service");

function validateRegisterBody(body) {
  if (!body.email || !body.password) {
    const error = new Error("Email and password are required.");
    error.statusCode = 400;
    throw error;
  }

  if (body.password.length < 8) {
    const error = new Error("Password must be at least 8 characters long.");
    error.statusCode = 400;
    throw error;
  }
}

function validateLoginBody(body) {
  if (!body.email || !body.password) {
    const error = new Error("Email and password are required.");
    error.statusCode = 400;
    throw error;
  }
}

async function register(req, res, next) {
  try {
    validateRegisterBody(req.body);

    const user = await registerUser(req.body);
    const accessToken = signAccessToken(user);

    return res.status(201).json({
      message: "User registered successfully.",
      accessToken,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    validateLoginBody(req.body);

    const user = await loginUser(req.body);
    const accessToken = signAccessToken(user);

    return res.status(200).json({
      message: "Login successful.",
      accessToken,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return next(error);
  }
}

function me(req, res) {
  return res.status(200).json({
    user: req.user
  });
}

module.exports = {
  login,
  me,
  register
};
