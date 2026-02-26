const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, tv: user.tokenVersion },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m" }
  );
}


function signRefreshToken(user, tokenId) {
  return jwt.sign(
    { sub: user._id.toString(), jti: tokenId },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d" }
  );
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getExpiryDateFromJwt(token) {
  const decoded = jwt.decode(token);
  // decoded.exp is seconds since epoch
  return new Date(decoded.exp * 1000);
}

async function issueRefreshToken(user) {
  const tokenId = crypto.randomUUID();
  const refreshToken = signRefreshToken(user, tokenId);

  await RefreshToken.create({
    userId: user._id,
    tokenId,
    tokenHash: hashToken(refreshToken),
    expiresAt: getExpiryDateFromJwt(refreshToken),
  });

  return refreshToken;
}

async function signup({ name, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error("Email already in use");
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash });

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user);

  return {
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    accessToken,
    refreshToken, // controller will store as cookie (you can omit from body later if you want)
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
  const refreshToken = await issueRefreshToken(user);

  return {
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    accessToken,
    refreshToken,
  };
}

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

  const tokenId = payload.jti;
  const userId = payload.sub;

  const tokenDoc = await RefreshToken.findOne({ tokenId, userId });
  if (!tokenDoc) {
    const err = new Error("Refresh token not recognized");
    err.statusCode = 401;
    throw err;
  }

  if (tokenDoc.revokedAt) {
    const err = new Error("Refresh token revoked");
    err.statusCode = 401;
    throw err;
  }

  // extra safety: compare hash
  if (tokenDoc.tokenHash !== hashToken(refreshToken)) {
    const err = new Error("Refresh token mismatch");
    err.statusCode = 401;
    throw err;
  }

  // Rotate: revoke old token and create a new one
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 401;
    throw err;
  }

  const newRefreshToken = await issueRefreshToken(user);
  const newPayload = jwt.decode(newRefreshToken);

  tokenDoc.revokedAt = new Date();
  tokenDoc.replacedByTokenId = newPayload.jti;
  await tokenDoc.save();

  const newAccessToken = signAccessToken(user);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

async function logout(refreshToken) {
  if (!refreshToken) return;

  try {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const tokenDoc = await RefreshToken.findOne({ tokenId: payload.jti, userId: payload.sub });
    if (tokenDoc && !tokenDoc.revokedAt) {
      tokenDoc.revokedAt = new Date();
      await tokenDoc.save();
    }
  } catch {
    // If token is invalid/expired, just ignore and clear cookie in controller
  }
}

module.exports = { signup, login, refresh, logout };