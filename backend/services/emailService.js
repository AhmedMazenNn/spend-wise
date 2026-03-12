const { google } = require("googleapis");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: "v1", auth: oauth2Client });

const FRONTEND_URL = process.env.APP_FRONTEND_URL || "http://localhost:5173";
const GMAIL_SENDER = process.env.GMAIL_SENDER;

function makeRawMessage({ to, subject, html, from }) {
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html,
  ].join("\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sendVerificationEmail(to, rawToken) {
  const link = `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(rawToken)}`;

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:36px;">💸</span>
        <h2 style="margin:8px 0;color:#0f172a;font-size:22px;">Verify your email</h2>
        <p style="color:#64748b;margin:0;">Welcome to SpendWise! One more step to get started.</p>
      </div>
      <div style="background:#fff;border-radius:8px;padding:24px;border:1px solid #e2e8f0;text-align:center;">
        <p style="color:#334155;margin:0 0 20px;">
          Click the button below to confirm your email address. This link expires in <strong>24 hours</strong>.
        </p>
        <a href="${link}" style="display:inline-block;padding:12px 28px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
          Verify Email
        </a>
          <p style="color:#94a3b8;font-size:12px;margin:20px 0 0;">
            Or copy this link: <a href="${link}" style="color:#059669;">${link}</a>
          </p>
      </div>
      <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:20px;">
        If you did not sign up for SpendWise, you can safely ignore this email.
      </p>
    </div>
  `;

  const raw = makeRawMessage({
    to,
    subject: "Verify your SpendWise email",
    html,
    from: `SpendWise <${GMAIL_SENDER}>`,
  });

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}

module.exports = { sendVerificationEmail };