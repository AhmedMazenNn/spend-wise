// backend/routes/authRoutes.js
const router = require("express").Router();
const {
  signup,
  login,
  verifyEmail,
  resendVerification,
  refresh,
  logout,
  profile,
  forgotPassword,
  resetPassword,
  changePassword,
  googleAuth,
} = require("../controllers/authController");
const {
  signupValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
} = require("../validators/authValidators");
const validate = require("../middlewares/validate");
const auth = require("../middlewares/auth");

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user (email/password)
 *     tags: [Auth]
 *     description: |
 *       Creates the account in an unverified state and sends a verification email.
 *       No tokens are returned — the user must click the verification link before they can log in.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, confirmPassword, phone]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Ahmed Mazen
 *               email:
 *                 type: string
 *                 example: ahmed@test.com
 *               password:
 *                 type: string
 *                 example: MyPass1!
 *               confirmPassword:
 *                 type: string
 *                 example: MyPass1!
 *               phone:
 *                 type: string
 *                 example: "+201234567890"
 *     responses:
 *       201:
 *         description: Account created. Verification email sent.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requiresVerification:
 *                   type: boolean
 *                   example: true
 *                 email:
 *                   type: string
 *       409:
 *         description: Email already in use (and already verified)
 */
router.post("/signup", signupValidator, validate, signup);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     description: Returns 403 with requiresVerification=true if email is not yet verified.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Email not verified
 */
router.post("/login", loginValidator, validate, login);

/**
 * @swagger
 * /api/auth/verify-email:
 *   get:
 *     summary: Verify email address via token from email link
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Raw verification token from the emailed link
 *     responses:
 *       200:
 *         description: Email verified. Access token returned.
 *       400:
 *         description: Invalid or expired token
 */
router.get("/verify-email", verifyEmail);

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend the verification email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email sent (if account exists and is unverified)
 *       429:
 *         description: Rate limited — too soon since last resend
 */
router.post("/resend-verification", resendVerification);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token cookie
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: New access token issued
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post("/refresh", refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout and revoke session
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post("/logout", auth, logout);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user info
 */
router.get("/profile", auth, profile);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset link sent (if account exists)
 */
router.post("/forgot-password", forgotPasswordValidator, validate, forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Set new password with reset token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword, confirmPassword]
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post("/reset-password", resetPasswordValidator, validate, resetPassword);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change password (requires authentication)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword, confirmNewPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmNewPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed
 *       401:
 *         description: Current password incorrect
 */
router.post("/change-password", auth, changePasswordValidator, validate, changePassword);

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: Google OAuth sign-in or register (intent-aware)
 *     tags: [Auth]
 *     description: |
 *       Pass `intent: 'login'` to sign in an existing user only.
 *       Pass `intent: 'register'` to create a new user only.
 *       The intent must match the page the user is on.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken, intent]
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Google ID token from GSI
 *               intent:
 *                 type: string
 *                 enum: [login, register]
 *     responses:
 *       200:
 *         description: Authenticated successfully
 *       401:
 *         description: No account found (login intent) or invalid token
 *       409:
 *         description: Account already exists (register intent)
 */
router.post("/google", googleAuth);

module.exports = router;