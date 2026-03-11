// backend/services/emailService.js
// Thin nodemailer wrapper for transactional emails.
// Configure via environment variables (see .env.example).

const nodemailer = require("nodemailer");

/** Lazily-created transporter; reused across calls. */
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465, // true for port 465 (SSL), false for 587 (STARTTLS)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return _transporter;
}

const FROM = process.env.EMAIL_FROM || "SpendWise <noreply@spendwise.app>";
const FRONTEND_URL = process.env.APP_FRONTEND_URL || "http://localhost:5173";

/**
 * Send an email-verification message.
 * @param {string} to - Recipient email address
 * @param {string} rawToken - The un-hashed verification token (included in the link)
 */
async function sendVerificationEmail(to, rawToken) {
  const link = `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(rawToken)}`;

  await getTransporter().sendMail({
    from: FROM,
    to,
    subject: "Verify your SpendWise email",
    text: `Welcome to SpendWise!\n\nPlease verify your email by visiting the link below. It expires in 24 hours.\n\n${link}\n\nIf you did not create this account, ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:36px;">💸</span>
          <h2 style="margin:8px 0;color:#0f172a;font-size:22px;">Verify your email</h2>
          <p style="color:#64748b;margin:0;">Welcome to SpendWise! One more step to get started.</p>
        </div>
        <div style="background:#fff;border-radius:8px;padding:24px;border:1px solid #e2e8f0;text-align:center;">
          <p style="color:#334155;margin:0 0 20px;">Click the button below to confirm your email address. This link expires in <strong>24 hours</strong>.</p>
          <a href="${link}" style="display:inline-block;padding:12px 28px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
            Verify Email
          </a>
          <p style="color:#94a3b8;font-size:12px;margin:20px 0 0;">Or copy this link: <a href="${link}" style="color:#059669;">${link}</a></p>
        </div>
        <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:20px;">If you did not sign up for SpendWise, you can safely ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail };
