const authService = require("../services/authService");
const User = require("../models/User");

function setRefreshCookie(res, refreshToken) {
  const isProd = process.env.NODE_ENV === "production";
  console.log(`Setting refresh cookie (Prod: ${isProd})`);
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

function clearRefreshCookie(res) {
  res.clearCookie("refreshToken", { path: "/" });
}

async function signup(req, res, next) {
  try {
    const { name, email, password, phone } = req.body;
    const result = await authService.signup({ name, email, password, phone });

    setRefreshCookie(res, result.refreshToken);

    return res.status(201).json({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
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
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    console.log("Refresh request cookies:", req.cookies);
    const tokenFromCookie = req.cookies?.refreshToken;
    const tokenFromBody = req.body?.refreshToken; // optional for Postman
    const token = tokenFromCookie || tokenFromBody;

    const result = await authService.refresh(token);

    setRefreshCookie(res, result.refreshToken);

    return res.status(200).json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    await User.updateOne(
      { _id: req.user._id },
      { $inc: { tokenVersion: 1 } }
    );
    clearRefreshCookie(res);
    return res.status(200).json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
}

async function profile(req, res) {
  return res.status(200).json({ user: req.user });
}

async function forgotPassword(req, res, next) {
  try {
    const result = await authService.forgotPassword(req.body.email);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    await authService.resetPassword(token, newPassword);
    return res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user._id, currentPassword, newPassword);
    return res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
}

async function googleAuth(req, res, next) {
  try {
    const { idToken } = req.body;
    const result = await authService.googleAuth(idToken);

    setRefreshCookie(res, result.refreshToken);

    return res.status(200).json({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    console.error('Google auth error:', err)
    return res.status(400).json({ message: err.message || 'Google auth failed' })
  }
}

module.exports = { signup, login, refresh, logout, profile, forgotPassword, resetPassword, changePassword, googleAuth };