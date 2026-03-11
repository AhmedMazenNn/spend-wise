// scripts/testEmail.js
// Run this to test your SMTP credentials:
//   node scripts/testEmail.js your@email.com

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const nodemailer = require("nodemailer");

const to = process.argv[2];
if (!to) {
  console.error("Usage: node scripts/testEmail.js your@email.com");
  process.exit(1);
}

async function main() {
  console.log("Testing SMTP connection...");
  console.log(`  HOST: ${process.env.EMAIL_HOST}`);
  console.log(`  PORT: ${process.env.EMAIL_PORT}`);
  console.log(`  USER: ${process.env.EMAIL_USER}`);
  console.log(`  PASS length: ${(process.env.EMAIL_PASS || "").length} chars`);
  console.log(`  FROM: ${process.env.EMAIL_FROM}`);
  console.log(`  Sending to: ${to}`);
  console.log("");

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.verify();
    console.log("✅ SMTP connection OK");

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: "SpendWise — SMTP Test",
      text: "This is a test email from SpendWise. If you received this, your Gmail App Password is working correctly!",
    });

    console.log("✅ Email sent! Message ID:", info.messageId);
    console.log("Check your inbox at:", to);
  } catch (err) {
    console.error("❌ SMTP Error:", err.message);
    console.error("");
    if (err.message.includes("Invalid login") || err.message.includes("535")) {
      console.error("→ The App Password is wrong. Make sure:");
      console.error("  1. 2-Step Verification is ON for your Google account");
      console.error("  2. You generated an App Password at: myaccount.google.com/apppasswords");
      console.error("  3. EMAIL_PASS in .env has NO spaces (16 chars exactly)");
    }
    process.exit(1);
  }
}

main();
