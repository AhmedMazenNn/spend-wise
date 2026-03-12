const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { oauth2Client, getGmailAuthUrl } = require("./config/gmailOAuth");
const express = require("express");
const cors = require("cors");

const connectDb = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const budgetRoutes = require("./routes/budgetRoutes");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const app = express();

// Trust proxy for secure cookies on Hugging Face / Vercel
app.set("trust proxy", 1);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://spend-wise-delta-rose.vercel.app",
  process.env.CLIENT_URL,
];

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(cookieParser());

// Add COOP/COEP for Google Auth and general security
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  next();
});

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow all vercel.app domains and localhost
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked for origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["set-cookie"],
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/budgets", budgetRoutes);

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     responses:
 *       200:
 *         description: OK
 */
app.get("/health", (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  
  // Log full error for server owner
  console.error(`[Server Error] ${status} - ${err.message}`);
  if (status === 500) console.error(err.stack);

  res.status(status).json({
    message: err.message || "Server error",
    stack: (process.env.NODE_ENV === "development" && status !== 401) ? err.stack : undefined,
  });
});

const PORT = process.env.PORT || 7860;

console.log("Swagger paths:", Object.keys(swaggerSpec.paths || {}));
app.get("/api/auth/gmail/connect", (req, res) => {
  res.redirect(getGmailAuthUrl());
});

app.get("/api/auth/gmail/callback", async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send("Missing authorization code");
    }

    const { tokens } = await oauth2Client.getToken(code);

    console.log("GMAIL TOKENS:", tokens);

    return res.send(
      `Gmail connected successfully. Copy this refresh token and put it in your .env:\n\n${tokens.refresh_token || "No refresh token returned"}`
    );
  } catch (err) {
    console.error("Gmail OAuth callback failed:", err);
    return res.status(500).send("Failed to connect Gmail");
  }
});
(async () => {
  await connectDb();
  console.log(`*************************************************`);
  console.log(`🚀 SERVER STARTING AT ${new Date().toISOString()}`);
  console.log(`🚀 Checking environment: PORT=${PORT}, NODE_ENV=${process.env.NODE_ENV}`);
  console.log(`*************************************************`);
  app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on port ${PORT}`));
})();