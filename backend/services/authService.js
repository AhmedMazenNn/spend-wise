const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, tv: user.tokenVersion ?? 0 },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m" }
  );
}

/** Stateless refresh token: includes tokenVersion so logout (tv bump) invalidates it. No DB storage. */
function signRefreshToken(user) {
  // Fallback for older Node versions where randomUUID is not available on crypto directly
  const jti = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
  return jwt.sign(
    {
      sub: user._id.toString(),
      tv: user.tokenVersion ?? 0,
      jti,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d" }
  );
}

async function signup({ name, email, password, phone }) {
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error("Email already in use");
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash, phone });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  return {
    user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    accessToken,
    refreshToken,
  };
}

async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  return {
    user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    accessToken,
    refreshToken,
  };
}

/** Logged-in user changes password; requires current password. Invalidates other sessions. */
async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 401;
    throw err;
  }
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    const err = new Error("Current password is incorrect");
    err.statusCode = 401;
    throw err;
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await User.updateOne(
    { _id: userId },
    { $set: { passwordHash }, $inc: { tokenVersion: 1 } }
  );
}

/** Verify refresh JWT and check tokenVersion; issue new tokens. No DB lookup for refresh tokens. */
async function refresh(refreshToken) {
  if (!refreshToken) {
    const err = new Error("Refresh token is required");
    err.statusCode = 401;
    throw err;
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    const err = new Error("Invalid or expired refresh token");
    err.statusCode = 401;
    throw err;
  }

  const userId = payload.sub;
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 401;
    throw err;
  }

  if (user.tokenVersion !== payload.tv) {
    const err = new Error("Refresh token has been revoked");
    err.statusCode = 401;
    throw err;
  }

  const newAccessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

const RESET_SECRET = process.env.RESET_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET;
const RESET_EXPIRY = process.env.RESET_TOKEN_EXPIRES_IN || "1h";

/** Forgot password: return a short-lived reset token (in production, send via email). */
async function forgotPassword(email) {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return { message: "If an account exists for this email, a reset link would be sent." };
  }
  const resetToken = jwt.sign(
    { email: user.email, purpose: "password_reset", sub: user._id.toString() },
    RESET_SECRET,
    { expiresIn: RESET_EXPIRY }
  );
  return {
    message: "If an account exists for this email, a reset link would be sent.",
    resetToken,
  };
}

/** Reset password: verify token and set new password. Increment tokenVersion to invalidate existing sessions. */
async function resetPassword(token, newPassword) {
  if (!token) {
    const err = new Error("Reset token is required");
    err.statusCode = 400;
    throw err;
  }
  let payload;
  try {
    payload = jwt.verify(token, RESET_SECRET);
  } catch {
    const err = new Error("Invalid or expired reset token");
    err.statusCode = 400;
    throw err;
  }
  if (payload.purpose !== "password_reset") {
    const err = new Error("Invalid reset token");
    err.statusCode = 400;
    throw err;
  }
  const user = await User.findById(payload.sub);
  if (!user || user.email !== payload.email) {
    const err = new Error("User not found");
    err.statusCode = 400;
    throw err;
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await User.updateOne(
    { _id: user._id },
    { $set: { passwordHash }, $inc: { tokenVersion: 1 } }
  );
}

/** Google OAuth: verify ID token, find or create user, return tokens. */
async function googleAuth(idToken) {
  if (!idToken) {
    const err = new Error("Google ID token is required");
    err.statusCode = 400;
    throw err;
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    const err = new Error("Invalid Google token");
    err.statusCode = 401;
    throw err;
  }

  const { sub: googleId, email, name, picture } = payload;

  // Try to find existing user by googleId first, then by email (link accounts)
  let user = await User.findOne({ googleId });

  if (!user) {
    user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      // Link Google to existing email account
      user.googleId = googleId;
      if (picture && !user.picture) user.picture = picture;
      await user.save();
    }
  }

  if (!user) {
    // Create a new user
    user = await User.create({
      name,
      email: email.toLowerCase(),
      googleId,
      picture: picture || null,
      passwordHash: null,
    });
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  return {
    user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, picture: user.picture },
    accessToken,
    refreshToken,
  };
}

module.exports = { signup, login, refresh, forgotPassword, resetPassword, changePassword, googleAuth };
