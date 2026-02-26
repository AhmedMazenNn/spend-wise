const router = require("express").Router();
const { signup, login, refresh, logout ,profile } = require("../controllers/authController");
const { signupValidator, loginValidator } = require("../validators/authValidators");
const validate = require("../middlewares/validate");
const auth = require("../middlewares/auth");

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, confirmPassword]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Ahmed Mazen
 *               email:
 *                 type: string
 *                 example: ahmed@test.com
 *               password:
 *                 type: string
 *                 example: 12345678
 *               confirmPassword:
 *                 type: string
 *                 example: 12345678
 *     responses:
 *       201:
 *         description: User created successfully
 *       409:
 *         description: Email already exists
 */
router.post("/signup", signupValidator, validate, signup);


/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user and return access token
 *     tags:
 *       - Auth
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
 *                 example: ahmed@test.com
 *               password:
 *                 type: string
 *                 example: 12345678
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", loginValidator, validate, login);


/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags:
 *       - Auth
 *     description: Uses refresh token from httpOnly cookie or request body.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: your_refresh_token_here
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
 *     summary: Logout user and revoke refresh token
 *     tags:
 *       - Auth
 *     description: Clears refresh token cookie and revokes token in database.
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", logout);

router.get("/profile",auth, profile);


module.exports = router;