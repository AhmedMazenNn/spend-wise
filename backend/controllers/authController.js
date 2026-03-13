// backend/controllers/authController.js
const authService = require("../services/authService");
const User = require("../models/User");

const COOKIE_NAME = "spendwise_refresh";

function getCookieOptions(req) {
  const isProd = process.env.NODE_ENV === "production";
  const isSecure = isProd && (req.secure || req.headers["x-forwarded-proto"] === "https");
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
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
  res.clearCookie(COOKIE_NAME, options);
  res.clearCookie(COOKIE_NAME, { ...options, secure: true, sameSite: "none" });
  res.clearCookie(COOKIE_NAME, { ...options, secure: false, sameSite: "lax" });
}

// ─── signup ───────────────────────────────────────────────────────────────────
// Does NOT issue tokens. Returns requiresVerification: true so the frontend
// redirects to the "check your email" page.
async function signup(req, res, next) {
  try {
    const { name, email, password, phone } = req.body;
    const result = await authService.signup({ name, email, password, phone });
    // result = { requiresVerification: true, email }
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// ─── login ────────────────────────────────────────────────────────────────────
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    setRefreshCookie(req, res, result.refreshToken);
    return res.status(200).json({ user: result.user, accessToken: result.accessToken });
  } catch (err) {
    // Surface the requiresVerification flag to the frontend
    if (err.requiresVerification) {
      return res.status(403).json({
        message: err.message,
        requiresVerification: true,
        email: err.email,
      });
    }
    next(err);
  }
}

// ─── verifyEmail ──────────────────────────────────────────────────────────────
// GET /api/auth/verify-email?token=<rawToken>
async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;
    const result = await authService.verifyEmail(token);
    // Issue tokens → user is now logged in
    setRefreshCookie(req, res, result.refreshToken);
    return res.status(200).json({
      user: result.user,
      accessToken: result.accessToken,
      alreadyVerified: result.alreadyVerified || false,
    });
  } catch (err) {
    if (err.expired) {
      return res.status(400).json({ message: err.message, expired: true, email: err.email });
    }
    next(err);
  }
}

// ─── resendVerification ───────────────────────────────────────────────────────
// POST /api/auth/resend-verification  { email }
async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    const result = await authService.resendVerification(email);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

// ─── refresh ──────────────────────────────────────────────────────────────────
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
    setRefreshCookie(req, res, result.refreshToken);
    return res.status(200).json({ accessToken: result.accessToken });
  } catch (err) {
    console.error("Refresh Logic Failed:", err.message);
    if (
      token &&
      (err.message === "Refresh token has been revoked" ||
        err.message === "Invalid or expired refresh token" ||
        err.statusCode === 401)
    ) {
      clearRefreshCookie(req, res);
    }
    next(err);
  }
}

// ─── logout ───────────────────────────────────────────────────────────────────
async function logout(req, res, next) {
  try {
    if (req.user) {
      await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
    }
    clearRefreshCookie(req, res);
    return res.status(200).json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
}

// ─── profile ──────────────────────────────────────────────────────────────────
async function profile(req, res) {
  return res.status(200).json({ user: req.user });
}

// ─── forgotPassword ───────────────────────────────────────────────────────────
async function forgotPassword(req, res, next) {
  try {
    const result = await authService.forgotPassword(req.body.email);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

// ─── resetPassword ────────────────────────────────────────────────────────────
async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    await authService.resetPassword(token, newPassword);
    return res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    next(err);
  }
}

// ─── changePassword ───────────────────────────────────────────────────────────
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user._id, currentPassword, newPassword);
    return res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
}

// ─── googleAuth ───────────────────────────────────────────────────────────────
// Accepts `intent: 'login' | 'register'` from request body.
async function googleAuth(req, res, next) {
  try {
    const { idToken, intent } = req.body;
    if (!intent || !["login", "register"].includes(intent)) {
      return res.status(400).json({ message: "intent must be 'login' or 'register'" });
    }

    const result = await authService.googleAuth(idToken, intent);
    setRefreshCookie(req, res, result.refreshToken);
    return res.status(200).json({ user: result.user, accessToken: result.accessToken });
  } catch (err) {
    console.error("Google auth error:", err);
    return res.status(err.statusCode || 400).json({ message: err.message || "Google auth failed" });
  }
}

// ─── onboarding ──────────────────────────────────────────────────────────────
async function completeOnboarding(req, res, next) {
  try {
    await authService.completeOnboarding(req.user._id);
    return res.status(200).json({ message: "Onboarding completed" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signup,
  login,
  verifyEmail,
  resendVerification,
  refresh,
  logout,
  profile,
  forgotPassword,
  resetPassword,
  changePassword,
  googleAuth,
  completeOnboarding,
};