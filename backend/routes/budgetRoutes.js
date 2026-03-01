const router = require("express").Router();
const { setBudget, getActiveBudget, removeBudget } = require("../controllers/budgetController");
const auth = require("../middlewares/auth");

/**
 * @swagger
 * /api/budgets:
 *   post:
 *     summary: Set or update active budget for a time period
 *     tags: [Budgets]
 *     description: Creates a new budget and deactivates any existing active budget. Use this to track spending against a target for a date range.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, startDate, endDate]
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 5000
 *                 description: Budget amount in EGP
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-02-01"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-02-28"
 *               name:
 *                 type: string
 *                 description: Optional budget name
 *     responses:
 *       201:
 *         description: Budget created/updated
 *       401:
 *         description: Unauthorized
 */
router.post("/", auth, setBudget);

/**
 * @swagger
 * /api/budgets/active:
 *   get:
 *     summary: Get current active budget
 *     tags: [Budgets]
 *     description: Returns the active budget for the current period (startDate <= today <= endDate). Returns null if none.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active budget or null
 *       401:
 *         description: Unauthorized
 */
router.get("/active", auth, getActiveBudget);

/**
 * @swagger
 * /api/budgets/{id}:
 *   delete:
 *     summary: Remove (deactivate) a budget
 *     tags: [Budgets]
 *     description: Sets the budget as inactive. User can edit by creating a new budget via POST.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectid
 *     responses:
 *       200:
 *         description: Budget removed
 *       401:
 *         description: Unauthorized
 */
router.delete("/:id", auth, removeBudget);

module.exports = router;
