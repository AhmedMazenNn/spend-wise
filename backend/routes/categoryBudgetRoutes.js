const router = require("express").Router();
const { setCategoryBudget, getCategoryBudgets } = require("../controllers/categoryBudgetController");
const auth = require("../middlewares/auth");

/**
 * @swagger
 * /api/category-budgets:
 *   post:
 *     summary: Set or update a budget for a category
 *     tags: [Category Budgets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [categoryId, amount, startDate, endDate]
 *             properties:
 *               categoryId:
 *                 type: string
 *               amount:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 */
router.post("/", auth, setCategoryBudget);

/**
 * @swagger
 * /api/category-budgets:
 *   get:
 *     summary: Get active category budgets
 *     tags: [Category Budgets]
 *     security:
 *       - bearerAuth: []
 */
router.get("/", auth, getCategoryBudgets);

module.exports = router;
