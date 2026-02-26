const router = require("express").Router();
const auth = require("../middlewares/auth");
const requireAdmin = require("../middlewares/requireAdmin");
const validate = require("../middlewares/validate");
const { getAllUsers, updateMe, updateUserByAdmin, deleteMe, deleteUserByAdmin } = require("../controllers/userController");
const { updateMeValidator, updateUserByAdminValidator } = require("../validators/userValidators");

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List all users (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin required
 */
router.get("/", auth, requireAdmin, getAllUsers);

/**
 * @swagger
 * /api/users/me:
 *   patch:
 *     summary: Update current user's profile
 *     tags: [Users]
 *     description: User can update own name, email, and/or phone. Use /auth/change-password for password.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               name:
 *                 type: string
 *                 example: New Name
 *               email:
 *                 type: string
 *                 example: new@example.com
 *               phone:
 *                 type: string
 *                 example: "+201234567890"
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Email already in use
 */
router.patch("/me", auth, updateMeValidator, validate, updateMe);

/**
 * @swagger
 * /api/users/me:
 *   delete:
 *     summary: Delete own account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted
 *       401:
 *         description: Unauthorized
 */
router.delete("/me", auth, deleteMe);

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: Update any user (admin only)
 *     tags: [Users]
 *     description: Admin can update a user's name, email, role, and/or password. At least one field required.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin required
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already in use
 */
router.patch("/:id", auth, requireAdmin, updateUserByAdminValidator, validate, updateUserByAdmin);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete any user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin required
 *       404:
 *         description: User not found
 */
router.delete("/:id", auth, requireAdmin, deleteUserByAdmin);

module.exports = router;