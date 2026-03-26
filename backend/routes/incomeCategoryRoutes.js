const router = require("express").Router();
const { getIncomeCategories, updateIncomeCategory, deleteIncomeCategory } = require("../controllers/incomeCategoryController");
const auth = require("../middlewares/auth");

/**
 * @swagger
 * /api/income-categories:
 *   get:
 *     summary: List all categories for income creation
 *     tags: [Income Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of income categories
 */
router.get("/", auth, getIncomeCategories);

/**
 * @swagger
 * /api/income-categories/{id}:
 *   patch:
 *     summary: Update a user-specific income category
 *     tags: [Income Categories]
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
 *         description: Income category updated
 */
router.patch("/:id", auth, updateIncomeCategory);
router.delete("/:id", auth, deleteIncomeCategory);

module.exports = router;
