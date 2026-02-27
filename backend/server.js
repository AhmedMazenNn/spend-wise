const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");

const connectDb = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");


const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const app = express();

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));


app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true, // IMPORTANT for cookies
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE" ],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
const PORT = process.env.PORT || 5000;

app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message || "Server error",
  });
});


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

console.log("Swagger paths:", Object.keys(swaggerSpec.paths || {}));
(async () => {
  await connectDb();
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
})();