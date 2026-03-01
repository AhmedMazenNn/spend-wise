const Expense = require("../models/Expense");

/**
 * POST /api/expenses
 * Body: { amount, title, note?, date, categoryId }
 */
async function createExpense(req, res, next) {
  try {
    const { amount, title, note, date, categoryId } = req.body;
    const userId = req.user._id;

    const expense = await Expense.create({
      userId,
      categoryId,
      amount: Number(amount),
      title: title?.trim() || "Untitled",
      note: note || null,
      date: date ? new Date(date) : new Date(),
    });

    const populated = await Expense.findById(expense._id)
      .populate("categoryId", "name icon color")
      .lean();

    return res.status(201).json({
      expense: {
        id: populated._id,
        amount: populated.amount,
        title: populated.title,
        category: populated.categoryId?.name || "Uncategorized",
        date: new Date(populated.date).toISOString().split("T")[0],
        emoji: populated.categoryId?.icon || "📦",
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/expenses
 * Query: limit, offset, period, startDate, endDate
 */
async function getExpenses(req, res, next) {
  try {
    const userId = req.user._id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 5000);
    const offset = parseInt(req.query.offset) || 0;
    const period = (req.query.period || "all").toLowerCase();
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const search = (req.query.search || "").trim();

    const match = { userId };
    if (search) {
      match.$or = [
        { title: { $regex: search, $options: "i" } },
        { note: { $regex: search, $options: "i" } },
      ];
    }
    if (period === "custom" && startDate && endDate) {
      match.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + "T23:59:59.999Z"),
      };
    } else if (period === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      match.date = { $gte: today, $lt: tomorrow };
    } else if (period === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      match.date = { $gte: weekAgo };
    } else if (period === "month") {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      match.date = { $gte: monthAgo };
    }

    const [expenses, total] = await Promise.all([
      Expense.find(match)
        .populate("categoryId", "name icon color")
        .sort({ date: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Expense.countDocuments(match),
    ]);

    const items = expenses.map((e) => ({
      id: e._id,
      amount: e.amount,
      title: e.title,
      note: e.note,
      category: e.categoryId?.name || "Uncategorized",
      categoryId: e.categoryId?._id,
      date: new Date(e.date).toISOString().split("T")[0],
      emoji: e.categoryId?.icon || "📦",
    }));

    return res.status(200).json({ expenses: items, total });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/expenses/:id
 */
async function updateExpense(req, res, next) {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { amount, title, note, date, categoryId } = req.body;

    const update = {};
    if (amount != null) update.amount = Number(amount);
    if (title != null) update.title = String(title).trim() || "Untitled";
    if (note !== undefined) update.note = note || null;
    if (date != null) update.date = new Date(date);
    if (categoryId != null) update.categoryId = categoryId;

    const expense = await Expense.findOneAndUpdate(
      { _id: id, userId },
      { $set: update },
      { new: true }
    )
      .populate("categoryId", "name icon color")
      .lean();

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    return res.status(200).json({
      expense: {
        id: expense._id,
        amount: expense.amount,
        title: expense.title,
        note: expense.note,
        category: expense.categoryId?.name || "Uncategorized",
        categoryId: expense.categoryId?._id,
        date: new Date(expense.date).toISOString().split("T")[0],
        emoji: expense.categoryId?.icon || "📦",
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/expenses/:id
 */
async function deleteExpense(req, res, next) {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const deleted = await Expense.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
      return res.status(404).json({ message: "Expense not found" });
    }
    return res.status(200).json({ message: "Expense deleted" });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/expenses/export
 * Query: period, startDate, endDate, search
 * Returns CSV file
 */
async function exportExpenses(req, res, next) {
  try {
    const userId = req.user._id;
    const period = (req.query.period || "all").toLowerCase();
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const search = (req.query.search || "").trim();

    const match = { userId };
    if (search) {
      match.$or = [
        { title: { $regex: search, $options: "i" } },
        { note: { $regex: search, $options: "i" } },
      ];
    }
    if (period === "custom" && startDate && endDate) {
      match.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + "T23:59:59.999Z"),
      };
    } else if (period === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      match.date = { $gte: today, $lt: tomorrow };
    } else if (period === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      match.date = { $gte: weekAgo };
    } else if (period === "month") {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      match.date = { $gte: monthAgo };
    }

    const expenses = await Expense.find(match)
      .populate("categoryId", "name")
      .sort({ date: -1 })
      .lean();

    const escapeCsv = (v) => {
      const s = String(v ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const header = "Date,Title,Category,Amount,Note";
    const rows = expenses.map((e) =>
      [
        new Date(e.date).toISOString().split("T")[0],
        escapeCsv(e.title),
        escapeCsv(e.categoryId?.name || "Uncategorized"),
        e.amount,
        escapeCsv(e.note || ""),
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="expenses-${new Date().toISOString().split("T")[0]}.csv"`
    );
    return res.send(csv);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
  exportExpenses,
};
