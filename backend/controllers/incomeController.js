const Income = require("../models/Income");

/**
 * POST /api/incomes
 */
async function createIncome(req, res, next) {
  try {
    const { amount, title, note, date, categoryId, categoryName, categoryIcon, categoryColor, frequency, status } = req.body;
    const userId = req.user._id;

    let finalCategoryId = categoryId;

    if (categoryId === "other" && categoryName) {
      const trimmedName = categoryName.trim();
      let customCat = await require("../models/IncomeCategory").findOne({
        name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
        $or: [{ userId: null }, { userId }],
      });

      if (!customCat) {
        customCat = await require("../models/IncomeCategory").create({
          name: trimmedName,
          userId,
          icon: categoryIcon || "✨",
          color: categoryColor || "#10B981",
        });
      }
      finalCategoryId = customCat._id;
    }

    const income = await Income.create({
      userId,
      categoryId: finalCategoryId,
      amount: Number(amount),
      title: title?.trim() || "Untitled",
      category: categoryName || "Other", // fallback for legacy
      emoji: categoryIcon || "✨", // fallback for legacy
      date: date ? new Date(date) : new Date(),
      frequency: frequency || "one-time",
      note: note || null,
      status: status || "received"
    });

    const populated = await Income.findById(income._id)
      .populate("categoryId", "name icon color")
      .lean();

    return res.status(201).json({
      income: {
        id: populated._id,
        amount: populated.amount,
        title: populated.title,
        category: populated.categoryId?.name || populated.category,
        emoji: populated.categoryId?.icon || populated.emoji,
        categoryId: populated.categoryId?._id,
        date: new Date(populated.date).toISOString().split("T")[0],
        frequency: populated.frequency,
        status: populated.status,
        note: populated.note
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/incomes
 */
async function getIncomes(req, res, next) {
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

    const [incomes, total] = await Promise.all([
      Income.find(match)
        .populate("categoryId", "name icon color")
        .sort({ date: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Income.countDocuments(match),
    ]);

    const items = incomes.map((e) => ({
      id: e._id,
      amount: e.amount,
      title: e.title,
      category: e.categoryId?.name || e.category,
      categoryColor: e.categoryId?.color,
      categoryId: e.categoryId?._id,
      emoji: e.categoryId?.icon || e.emoji,
      date: new Date(e.date).toISOString().split("T")[0],
      frequency: e.frequency,
      status: e.status,
      note: e.note
    }));

    return res.status(200).json({ incomes: items, total });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/incomes/:id
 */
async function updateIncome(req, res, next) {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { amount, title, note, date, category, emoji, frequency, status } = req.body;

    const update = {};
    if (amount != null) update.amount = Number(amount);
    if (title != null) update.title = String(title).trim() || "Untitled";
    if (note !== undefined) update.note = note || null;
    if (date != null) update.date = new Date(date);
    if (category != null) update.category = category;
    if (emoji != null) update.emoji = emoji;
    if (frequency != null) update.frequency = frequency;
    if (status != null) update.status = status;

    const income = await Income.findOneAndUpdate(
      { _id: id, userId },
      { $set: update },
      { new: true }
    )
      .populate("categoryId", "name icon color")
      .lean();

    if (!income) {
      return res.status(404).json({ message: "Income not found" });
    }

    return res.status(200).json({
      income: {
        id: income._id,
        amount: income.amount,
        title: income.title,
        category: income.categoryId?.name || income.category,
        emoji: income.categoryId?.icon || income.emoji,
        categoryId: income.categoryId?._id,
        date: new Date(income.date).toISOString().split("T")[0],
        frequency: income.frequency,
        status: income.status,
        note: income.note
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/incomes/:id
 */
async function deleteIncome(req, res, next) {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const deleted = await Income.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
      return res.status(404).json({ message: "Income not found" });
    }
    return res.status(200).json({ message: "Income deleted" });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/incomes/export
 */
async function exportIncomes(req, res, next) {
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

    const incomes = await Income.find(match).sort({ date: -1 }).lean();

    const escapeCsv = (v) => {
      const s = String(v ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const header = "Date,Title,Category,Status,Frequency,Amount,Note";
    const rows = incomes.map((e) =>
      [
        new Date(e.date).toISOString().split("T")[0],
        escapeCsv(e.title),
        escapeCsv(e.category),
        escapeCsv(e.status),
        escapeCsv(e.frequency),
        e.amount,
        escapeCsv(e.note || ""),
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");

    const bom = Buffer.from([0xFF, 0xFE]);
    const csvBuffer = Buffer.from(csv, "utf16le");

    res.setHeader("Content-Type", "text/csv; charset=utf-16le");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="incomes-${new Date().toISOString().split("T")[0]}.csv"`
    );
    return res.send(Buffer.concat([bom, csvBuffer]));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createIncome,
  getIncomes,
  updateIncome,
  deleteIncome,
  exportIncomes,
};
