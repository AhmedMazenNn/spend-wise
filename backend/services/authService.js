// backend/services/authService.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { sendVerificationEmail } = require("./emailService");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Token helpers ────────────────────────────────────────────────────────────

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, tv: user.tokenVersion ?? 0 },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m" }
  );
}

/** Stateless refresh token: includes tokenVersion so logout (tv bump) invalidates it. */
function signRefreshToken(user) {
  const jti = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
  return jwt.sign(
    { sub: user._id.toString(), tv: user.tokenVersion ?? 0, jti },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d" }
  );
}

/**
 * Generate a secure random token, return the raw value and its SHA-256 hash.
 * Only the hash gets stored in the DB — the raw token travels in the email link.
 */
function generateVerificationToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

/** Hash an incoming raw token for DB comparison. */
function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Verification token TTL in hours (default 24h). */
function getVerifyExpiresAt() {
  const hours = Number(process.env.EMAIL_VERIFY_TOKEN_EXPIRES_HOURS) || 24;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/** Returns a safe user object (no sensitive fields). */
function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    picture: user.picture,
    isVerified: user.isVerified,
    provider: user.provider,
  };
}

// ─── signup ───────────────────────────────────────────────────────────────────
async function signup({ name, email, password, phone }) {
  email = email.toLowerCase().trim();

  const existing = await User.findOne({ email });

  if (existing) {
    if (!existing.isVerified) {
      const { raw, hash } = generateVerificationToken();

      await User.updateOne(
        { _id: existing._id },
        {
          verificationTokenHash: hash,
          verificationTokenExpires: getVerifyExpiresAt(),
        }
      );

      try {
        await sendVerificationEmail(existing.email, raw);
        console.log(`[auth] Verification email re-sent to ${existing.email}`);
      } catch (emailErr) {
        console.error(
          "[emailService] ❌ Failed to resend verification email:",
          emailErr.message
        );
        console.error("[emailService] Full error:", emailErr);
      }

      return { requiresVerification: true, email: existing.email };
    }

    const err = new Error("Email already in use");
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const { raw, hash } = generateVerificationToken();

  await User.create({
    name,
    email,
    passwordHash,
    phone,
    provider: "email",
    isVerified: false,
    verificationTokenHash: hash,
    verificationTokenExpires: getVerifyExpiresAt(),
  });

  try {
    await sendVerificationEmail(email, raw);
    console.log(`[auth] Verification email sent to ${email}`);
  } catch (emailErr) {
    console.error(
      "[emailService] ❌ Failed to send verification email:",
      emailErr.message
    );
    console.error("[emailService] Full error:", emailErr);
  }

  return { requiresVerification: true, email };
}
// ─── login ────────────────────────────────────────────────────────────────────

async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }

  if (!user.passwordHash) {
    const err = new Error("This account uses Google sign-in. Please login with Google.");
    err.statusCode = 401;
    throw err;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }

  // ── Verification gate ──
  // Treat existing accounts that pre-date the isVerified field as verified
  // (isVerified === undefined || null is treated as verified for backward compat).
  const verified = user.isVerified === undefined || user.isVerified === null || user.isVerified === true;
  if (!verified) {
    const err = new Error("Please verify your email before signing in.");
    err.statusCode = 403;
    err.requiresVerification = true;
    err.email = user.email;
    throw err;
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  return { user: publicUser(user), accessToken, refreshToken };
}

// ─── verifyEmail ──────────────────────────────────────────────────────────────

/**
 * Verify a raw email-verification token.
 * Marks the user as verified and issues access/refresh tokens so they are
 * immediately logged in after clicking the link.
 */
async function verifyEmail(rawToken) {
  if (!rawToken) {
    const err = new Error("Verification token is required");
    err.statusCode = 400;
    throw err;
  }

  const hash = hashToken(rawToken);
  const user = await User.findOne({ verificationTokenHash: hash });

  if (!user) {
    const err = new Error("Invalid verification link. It may have already been used.");
    err.statusCode = 400;
    throw err;
  }

  // Already verified — idempotent success
  if (user.isVerified) {
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    return { alreadyVerified: true, user: publicUser(user), accessToken, refreshToken };
  }

  if (!user.verificationTokenExpires || user.verificationTokenExpires < new Date()) {
    const err = new Error("Verification link has expired. Please request a new one.");
    err.statusCode = 400;
    err.expired = true;
    err.email = user.email;
    throw err;
  }

  // Mark verified and clear the token fields
  user.isVerified = true;
  user.verificationTokenHash = null;
  user.verificationTokenExpires = null;
  await user.save();

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  return { user: publicUser(user), accessToken, refreshToken };
}

// ─── resendVerification ───────────────────────────────────────────────────────

const RESEND_COOLDOWN_MINUTES = 5;

async function resendVerification(email) {
  const user = await User.findOne({ email: email.toLowerCase().trim() });

  // Always return a generic OK — don't reveal whether an account exists
  if (!user || user.isVerified) {
    return { message: "If an unverified account exists for this email, a new link has been sent." };
  }

  // Rate-limit: don't resend if a recent token is still valid
  const cooldownMs = RESEND_COOLDOWN_MINUTES * 60 * 1000;
  if (
    user.verificationTokenExpires &&
    user.verificationTokenExpires.getTime() - Date.now() > // time remaining
      (Number(process.env.EMAIL_VERIFY_TOKEN_EXPIRES_HOURS) || 24) * 3600000 - cooldownMs
  ) {
    const err = new Error(
      `A verification email was sent recently. Please wait ${RESEND_COOLDOWN_MINUTES} minutes before requesting another.`
    );
    err.statusCode = 429;
    throw err;
  }

  const { raw, hash } = generateVerificationToken();
  await User.updateOne(
    { _id: user._id },
    { verificationTokenHash: hash, verificationTokenExpires: getVerifyExpiresAt() }
  );

  sendVerificationEmail(user.email, raw).catch((err) =>
    console.error("[emailService] Resend failed:", err.message)
  );

  return { message: "If an unverified account exists for this email, a new link has been sent." };
}

// ─── changePassword ───────────────────────────────────────────────────────────

async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 401;
    throw err;
  }
  if (!user.passwordHash) {
    const err = new Error("Cannot change password for social login accounts");
    err.statusCode = 400;
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

// ─── refresh ──────────────────────────────────────────────────────────────────

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

  const user = await User.findById(payload.sub);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 401;
    throw err;
  }

  const dbVersion = user.tokenVersion ?? 0;
  const jwtVersion = payload.tv ?? 0;
  if (dbVersion !== jwtVersion) {
    const err = new Error("Refresh token has been revoked");
    err.statusCode = 401;
    throw err;
  }

  return { accessToken: signAccessToken(user), refreshToken: signRefreshToken(user) };
}

// ─── forgotPassword / resetPassword ──────────────────────────────────────────

const RESET_SECRET = process.env.RESET_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET;
const RESET_EXPIRY = process.env.RESET_TOKEN_EXPIRES_IN || "1h";

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

// ─── googleAuth ───────────────────────────────────────────────────────────────

/**
 * Google OAuth sign-in/register with intent awareness.
 *
 * @param {string} idToken   - Google ID token from GSI
 * @param {'login'|'register'} intent - What the user intended when they clicked the Google button
 */
async function googleAuth(idToken, intent = "login") {
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

  // ── Look up existing user ──
  let user = await User.findOne({ googleId });
  if (!user) {
    user = await User.findOne({ email: email.toLowerCase() });
  }

  // ── Intent: LOGIN ──────────────────────────────────────────────────────────
  if (intent === "login") {
    if (!user) {
      const err = new Error(
        "No account found for this Google email. Please register first."
      );
      err.statusCode = 401;
      throw err;
    }

    // Link Google ID to email account if not already linked
    if (!user.googleId) {
      user.googleId = googleId;
      if (picture && !user.picture) user.picture = picture;
      // Linking via Google verifies the email
      if (!user.isVerified) user.isVerified = true;
      await user.save();
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    return { user: publicUser(user), accessToken, refreshToken };
  }

  // ── Intent: REGISTER ───────────────────────────────────────────────────────
  if (intent === "register") {
    if (user) {
      // Account already exists → tell user to login
      const err = new Error(
        "An account with this Google email already exists. Please sign in instead."
      );
      err.statusCode = 409;
      throw err;
    }

    // Create a new Google-authenticated user (always verified — Google already confirmed the email)
    user = await User.create({
      name,
      email: email.toLowerCase(),
      googleId,
      picture: picture || null,
      passwordHash: null,
      provider: "google",
      isVerified: true, // Google verified the email
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    return { user: publicUser(user), accessToken, refreshToken };
  }

  // Unknown intent — treat as login-side for safety
  const err = new Error("Invalid auth intent");
  err.statusCode = 400;
  throw err;
}

module.exports = {
  signup,
  login,
  verifyEmail,
  resendVerification,
  refresh,
  forgotPassword,
  resetPassword,
  changePassword,
  googleAuth,
};
