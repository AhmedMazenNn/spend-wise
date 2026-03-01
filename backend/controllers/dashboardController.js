const Expense = require("../models/Expense");
const Category = require("../models/Category");
const Budget = require("../models/Budget");

/**
 * Build date range from period or custom dates
 * @param {string} period - today | week | month | all
 * @param {string} [startDate] - ISO date for custom range
 * @param {string} [endDate] - ISO date for custom range
 * @returns {{ start: Date | null, end: Date }}
 */
function getDateRange(period, startDate, endDate) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  if (period === "custom" && startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  switch (period) {
    case "today":
      return {
        start: new Date(today),
        end: endOfToday,
      };
    case "week": {
      // Week runs Saturday to Friday
      const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      // Saturday=6, so days since Saturday: if Sat(6) -> 0, Sun(0) -> 1, ..., Fri(5) -> 6
      const daysSinceSaturday = (dayOfWeek + 1) % 7;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - daysSinceSaturday);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      return { start: weekStart, end: weekEnd };
    }
    case "month": {
      const monthAgo = new Date(today);
      monthAgo.setDate(today.getDate() - 30);
      return { start: monthAgo, end: endOfToday };
    }
    case "all":
    default:
      return { start: null, end: null };
  }
}

/**
 * GET /api/dashboard
 * Query: period (today|week|month|all|custom), startDate, endDate (for custom)
 */
async function getDashboard(req, res, next) {
  try {
    const userId = req.user._id;
    const period = (req.query.period || "all").toLowerCase();
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    const { start, end } = getDateRange(period, startDate, endDate);

    const matchStage = { userId };
    if (start && end) {
      matchStage.date = { $gte: start, $lte: end };
    }
    // "all" period: no date filter (start and end are null)

    // Fetch expenses in range with category
    const expenses = await Expense.find(matchStage)
      .populate("categoryId", "name icon color")
      .sort({ date: -1 })
      .lean();

    const totalSpent = expenses.reduce((acc, e) => acc + e.amount, 0);
    const count = expenses.length;

    // Days in period for daily average
    let daysInPeriod = 1;
    if (start && end) {
      const diffTime = Math.abs(end - start);
      daysInPeriod = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
    } else {
      daysInPeriod = 365; // "all" period
    }
    const dailyAvg = count > 0 ? totalSpent / Math.min(count, daysInPeriod) : 0;
    const highest = expenses.length ? Math.max(...expenses.map((e) => e.amount)) : 0;

    // Daily spending for area chart
    const dailyMap = {};
    expenses.forEach((e) => {
      const d = new Date(e.date);
      const key = d.toISOString().split("T")[0];
      dailyMap[key] = (dailyMap[key] || 0) + e.amount;
    });
    const dailySpending = Object.entries(dailyMap)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Category breakdown for pie chart
    const categoryMap = {};
    expenses.forEach((e) => {
      const name = e.categoryId?.name || "Uncategorized";
      const color = e.categoryId?.color || "#94A3B8";
      if (!categoryMap[name]) categoryMap[name] = { name, value: 0, color };
      categoryMap[name].value += e.amount;
    });
    const categoryData = Object.values(categoryMap).sort((a, b) => b.value - a.value);

    // Recent expenses (top 10)
    const recentExpenses = expenses.slice(0, 10).map((e) => ({
      id: e._id,
      amount: e.amount,
      title: e.title,
      category: e.categoryId?.name || "Uncategorized",
      date: new Date(e.date).toISOString().split("T")[0],
      emoji: e.categoryId?.icon || "📦",
    }));

    // Active budget (if any)
    let activeBudget = null;
    const budget = await Budget.findOne({
      userId,
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    }).lean();

    if (budget) {
      const budgetStart = new Date(budget.startDate);
      const budgetEnd = new Date(budget.endDate);
      budgetEnd.setHours(23, 59, 59, 999);
      const spentInBudget = expenses
        .filter((e) => {
          const d = new Date(e.date);
          return d >= budgetStart && d <= budgetEnd;
        })
        .reduce((acc, e) => acc + e.amount, 0);
      const percentage = Math.min((spentInBudget / budget.amount) * 100, 100);
      const remaining = budget.amount - spentInBudget;

      activeBudget = {
        id: budget._id,
        amount: budget.amount,
        startDate: budget.startDate,
        endDate: budget.endDate,
        spentInBudget,
        percentage,
        remaining,
        isOver: remaining < 0,
      };
    }

    return res.status(200).json({
      stats: {
        totalSpent,
        count,
        dailyAvg,
        highest,
        topCategory: categoryData[0]?.name || null,
      },
      dailySpending,
      categoryData,
      recentExpenses,
      activeBudget,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard };
