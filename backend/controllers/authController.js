const authService = require("../services/authService");
const User = require("../models/User");

const COOKIE_NAME = "spendwise_refresh";

function getCookieOptions(req) {
  const isProd = process.env.NODE_ENV === "production";
  const isSecure = isProd && (req.secure || req.headers["x-forwarded-proto"] === "https");

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax", // Proxied requests are same-site
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };
}

function setRefreshCookie(req, res, refreshToken) {
  res.cookie(COOKIE_NAME, refreshToken, getCookieOptions(req));
}

function clearRefreshCookie(req, res) {
  const options = getCookieOptions(req);
  delete options.maxAge;
  
  // Clear with standard options
  res.clearCookie(COOKIE_NAME, options);
  
  // Also clear variations to be sure (especially important for localhost/Secure mismatch)
  res.clearCookie(COOKIE_NAME, { ...options, secure: true, sameSite: "none" });
  res.clearCookie(COOKIE_NAME, { ...options, secure: false, sameSite: "lax" });
}

async function signup(req, res, next) {
  try {
    const { name, email, password, phone } = req.body;
    const result = await authService.signup({ name, email, password, phone });

    setRefreshCookie(req, res, result.refreshToken);

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

    setRefreshCookie(req, res, result.refreshToken);

    return res.status(200).json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  let token = null;
  try {
    token = req.cookies?.[COOKIE_NAME];
    
    console.log("--- REFRESH ATTEMPT ---");
    console.log(`Has Cookie (${COOKIE_NAME}):`, !!token);
    
    if (!token) {
      const err = new Error("Refresh token is required");
      err.statusCode = 401;
      throw err;
    }

    const result = await authService.refresh(token);

    // Issue new refresh token (rotation)
    setRefreshCookie(req, res, result.refreshToken);

    return res.status(200).json({
      accessToken: result.accessToken,
    });
  } catch (err) {
    console.error("Refresh Logic Failed:", err.message);
    if (
      token && (
        err.message === "Refresh token has been revoked" ||
        err.message === "Invalid or expired refresh token" ||
        err.statusCode === 401
      )
    ) {
      console.log("Clearing stale/invalid refresh cookie");
      clearRefreshCookie(req, res);
    }
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    if (req.user) {
      await User.updateOne(
        { _id: req.user._id },
        { $inc: { tokenVersion: 1 } }
      );
    }
    clearRefreshCookie(req, res);
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

    setRefreshCookie(req, res, result.refreshToken);

    return res.status(200).json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    console.error('Google auth error:', err)
    return res.status(400).json({ message: err.message || 'Google auth failed' })
  }
}

module.exports = { signup, login, refresh, logout, profile, forgotPassword, resetPassword, changePassword, googleAuth };