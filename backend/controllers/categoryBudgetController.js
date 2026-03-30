const CategoryBudget = require("../models/CategoryBudget");

/**
 * POST /api/category-budgets - Create or update a budget for a specific category
 */
async function setCategoryBudget(req, res, next) {
  try {
    const userId = req.user._id;
    const { categoryId, amount, startDate, endDate, warningThreshold } = req.body;
    if (!categoryId || !amount || !startDate || !endDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Deactivate any existing active budget for this category and user
    await CategoryBudget.updateMany(
      { userId, categoryId, isActive: true },
      { isActive: false }
    );

    const budget = await CategoryBudget.create({
      userId,
      categoryId,
      amount: Number(amount),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      warningThreshold: warningThreshold !== undefined ? Number(warningThreshold) : 70,
      isActive: true,
    });

    return res.status(201).json({
      budget: {
        id: budget._id,
        categoryId: budget.categoryId,
        amount: budget.amount,
        startDate: budget.startDate,
        endDate: budget.endDate,
        warningThreshold: budget.warningThreshold || 70,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Helper to safely require Expense model
const Expense = require("../models/Expense");

/**
 * GET /api/category-budgets - Get all active category budgets for the current user
 */
async function getCategoryBudgets(req, res, next) {
  try {
    const userId = req.user._id;

    const budgets = await CategoryBudget.find({
      userId,
      isActive: true,
    }).lean();

    const budgetsWithSpent = await Promise.all(budgets.map(async (b) => {
      const budgetStart = new Date(b.startDate);
      const budgetEnd = new Date(b.endDate);
      budgetEnd.setHours(23, 59, 59, 999);

      const expenses = await Expense.aggregate([
        {
          $match: {
            userId: b.userId,
            categoryId: b.categoryId,
            date: { $gte: budgetStart, $lte: budgetEnd }
          }
        },
        { $group: { _id: null, totalSpent: { $sum: "$amount" } } }
      ]);

      return {
        id: b._id,
        categoryId: b.categoryId,
        amount: b.amount,
        startDate: b.startDate,
        endDate: b.endDate,
        warningThreshold: b.warningThreshold || 70,
        spent: expenses[0]?.totalSpent || 0
      };
    }));

    return res.status(200).json({
      budgets: budgetsWithSpent,
    });
  } catch (err) {
    next(err);
  }
}

//Remove Category Budget
async function removeCategoryBudget(req, res, next) {
  try {
    const userId = req.user._id;
    const { categoryId } = req.body;
    if (!categoryId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await CategoryBudget.updateMany(
      { userId, categoryId, isActive: true },
      { isActive: false }
    );

    return res.status(200).json({ message: "Category budget removed successfully" });
  } catch (err) {
    next(err);
  }
}

module.exports = { setCategoryBudget, getCategoryBudgets, removeCategoryBudget };
