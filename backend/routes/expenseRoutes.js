// routes/expenseRoutes.js
const router = require("express").Router();
const {
  createExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
  exportExpenses,
} = require("../controllers/expenseController");
const auth = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { createExpenseValidator } = require("../validators/expenseValidators");

/**
 * @swagger
 * /api/expenses:
 *   post:
 *     summary: Add a new expense (supports attachments)
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [amount, categoryId]
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 45.50
 *               title:
 *                 type: string
 *                 example: Lunch at cafe
 *               note:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2026-02-28"
 *               categoryId:
 *                 type: string
 *                 format: objectid
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Expense created
 *       400:
 *         description: Validation error
 */
router.post(
  "/",
  auth,
  createExpenseValidator,
  validate,
  createExpense
);

/**
 * @swagger
 * /api/expenses:
 *   get:
 *     summary: List expenses with optional filters
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, all, custom]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of expenses
 */
router.get("/", auth, getExpenses);
router.get("/export", auth, exportExpenses);
router.patch("/:id", auth, updateExpense);
router.delete("/:id", auth, deleteExpense);

module.exports = router;