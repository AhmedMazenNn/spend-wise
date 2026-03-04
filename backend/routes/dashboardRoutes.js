const router = require("express").Router();
const { getDashboard } = require("../controllers/dashboardController");
const auth = require("../middlewares/auth");

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Get dashboard data (stats, charts, recent expenses)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, all, custom]
 *         description: Time period filter
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Dashboard data
 */
router.get("/", auth, getDashboard);

module.exports = router;
