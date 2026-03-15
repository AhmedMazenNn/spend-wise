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
const GMAIL_SENDER = process.env.GMAIL_SENDER || "ahmed24mazen@gmail.com";
const APP_NAME = "SpendWise";

function makeRawMessage({ to, subject, html, text, from }) {
  const boundary = "boundary_" + Date.now();

  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Reply-To: ${from}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    text,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    html,
    "",
    `--${boundary}--`,
  ].join("\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sendVerificationEmail(to, rawToken) {
  const link = `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(rawToken)}`;

  const subject = `Verify your email address for ${APP_NAME}`;

  const text = `
Verify your email address

Welcome to ${APP_NAME}.

Please confirm your email address by visiting the link below:
${link}

This verification link will expire in 24 hours.

If you did not create a ${APP_NAME} account, you can safely ignore this email.
  `.trim();

  const html = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${subject}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="width:100%;background-color:#f8fafc;padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 16px;text-align:center;">
              <div style="font-size:32px;line-height:1;">💸</div>
              <h1 style="margin:12px 0 8px;font-size:24px;line-height:32px;color:#0f172a;">
                Verify your email address
              </h1>
              <p style="margin:0;font-size:15px;line-height:24px;color:#475569;">
                Welcome to <strong>${APP_NAME}</strong>. Please confirm your email to complete your account setup.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 32px 0;">
              <div style="font-size:15px;line-height:24px;color:#334155;">
                To activate your account, click the button below:
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;text-align:center;">
              <a
                href="${link}"
                style="display:inline-block;background-color:#059669;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:8px;"
              >
                Verify Email
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 8px;">
              <p style="margin:0;font-size:14px;line-height:22px;color:#475569;">
                This verification link will expire in <strong>24 hours</strong>.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 32px 0;">
              <p style="margin:0;font-size:14px;line-height:22px;color:#475569;">
                If the button does not work, copy and paste this link into your browser:
              </p>
              <p style="margin:12px 0 0;word-break:break-word;">
                <a href="${link}" style="color:#059669;text-decoration:none;">${link}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 32px;">
              <p style="margin:0;font-size:13px;line-height:22px;color:#94a3b8;">
                If you did not create a ${APP_NAME} account, no further action is required and you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>

        <div style="max-width:600px;margin:12px auto 0;text-align:center;font-size:12px;line-height:18px;color:#94a3b8;">
          © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
        </div>
      </div>
    </body>
  </html>
  `;

  const raw = makeRawMessage({
    to,
    subject,
    html,
    text,
    from: `${APP_NAME} <${GMAIL_SENDER}>`,
  });

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}

module.exports = { sendVerificationEmail };