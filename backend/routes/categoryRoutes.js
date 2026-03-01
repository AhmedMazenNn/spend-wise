const router = require("express").Router();
const { getCategories } = require("../controllers/categoryController");
const auth = require("../middlewares/auth");

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: List all categories for expense creation
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get("/", auth, getCategories);

module.exports = router;
