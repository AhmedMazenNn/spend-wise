const authService = require("../services/authService");

function setRefreshCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

function clearRefreshCookie(res) {
  res.clearCookie("refreshToken", { path: "/api/auth" });
}

async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const result = await authService.signup({ name, email, password });

    setRefreshCookie(res, result.refreshToken);

    return res.status(201).json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    setRefreshCookie(res, result.refreshToken);

    return res.status(200).json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const tokenFromCookie = req.cookies?.refreshToken;
    const tokenFromBody = req.body?.refreshToken; // optional for Postman
    const token = tokenFromCookie || tokenFromBody;

    const result = await authService.refresh(token);

    setRefreshCookie(res, result.refreshToken);

    return res.status(200).json({
      accessToken: result.accessToken,
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    // revoke ALL refresh tokens for this user (optional but recommended)
    await RefreshToken.updateMany(
      { userId: req.user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    // instantly invalidate ALL access tokens
    await User.updateOne(
      { _id: req.user._id },
      { $inc: { tokenVersion: 1 } }
    );

    res.clearCookie("refreshToken", { path: "/api/auth" });
    return res.status(200).json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
}
async function profile(req, res) {
  return res.status(200).json({ user: req.user });
}

module.exports = { signup, login, refresh, logout, profile };