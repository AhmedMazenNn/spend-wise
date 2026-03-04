const Budget = require("../models/Budget");

/**
 * POST /api/budgets - Create or update active budget
 */
async function setBudget(req, res, next) {
  try {
    const userId = req.user._id;
    const { amount, startDate, endDate, name } = req.body;

    // Deactivate any existing active budget
    await Budget.updateMany({ userId, isActive: true }, { isActive: false });

    const budget = await Budget.create({
      userId,
      amount: Number(amount),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      name: name || null,
      isActive: true,
    });

    return res.status(201).json({
      budget: {
        id: budget._id,
        amount: budget.amount,
        startDate: budget.startDate,
        endDate: budget.endDate,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/budgets - Get active budget
 */
async function getActiveBudget(req, res, next) {
  try {
    const userId = req.user._id;
    const budget = await Budget.findOne({
      userId,
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    }).lean();

    if (!budget) {
      return res.status(200).json({ budget: null });
    }

    return res.status(200).json({
      budget: {
        id: budget._id,
        amount: budget.amount,
        startDate: budget.startDate,
        endDate: budget.endDate,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/budgets/:id - Remove budget (set inactive)
 */
async function removeBudget(req, res, next) {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    await Budget.findOneAndUpdate(
      { _id: id, userId },
      { isActive: false }
    );
    return res.status(200).json({ message: "Budget removed" });
  } catch (err) {
    next(err);
  }
}

module.exports = { setBudget, getActiveBudget, removeBudget };
