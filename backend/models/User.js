const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: false, default: null },
    googleId: { type: String, sparse: true, unique: true },
    picture: { type: String, default: null },
    phone: { type: String, trim: true, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    tokenVersion: { type: Number, default: 0 },

    // ─── Email Verification ───────────────────────────────────────────────────
    // provider: how the account was originally created
    provider: { type: String, enum: ["email", "google"], default: "email" },
    // Google-authenticated users (and existing accounts) are treated as verified
    isVerified: { type: Boolean, default: false },
    // Only the SHA-256 hash of the raw token is stored (never the raw token itself)
    verificationTokenHash: { type: String, default: null },
    verificationTokenExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);