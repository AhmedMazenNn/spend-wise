const router = require("express").Router();
const { getCategories, updateCategory, deleteCategory } = require("../controllers/categoryController");
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

/**
 * @swagger
 * /api/categories/{id}:
 *   patch:
 *     summary: Update a user-specific category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               icon:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category updated
 */
router.patch("/:id", auth, updateCategory);
router.delete("/:id", auth, deleteCategory);

module.exports = router;
