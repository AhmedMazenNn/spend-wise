const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

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
  "https://spend-wise-delta-rose.vercel.app",
];

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(cookieParser());

// Add COOP/COEP for Google Auth and general security
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
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
  console.error("Server Error:", err);
  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message || "Server error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

const PORT = process.env.PORT || 7860;

console.log("Swagger paths:", Object.keys(swaggerSpec.paths || {}));

(async () => {
  await connectDb();
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
})();