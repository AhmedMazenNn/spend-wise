const IncomeCategory = require("../models/IncomeCategory");

/**
 * GET /api/income-categories
 * Returns all categories for income creation
 */
async function getIncomeCategories(req, res, next) {
  try {
    const userId = req.user._id;
    const match = {
      $or: [{ userId: null }, { userId }],
    };
    const categories = await IncomeCategory.find(match)
      .sort({ name: 1 })
      .lean();
    return res.status(200).json({
      categories: categories.map((c) => ({
        id: c._id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        isCustom: !!c.userId,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/income-categories/:id
 * Allows updating user-specific income categories
 */
async function updateIncomeCategory(req, res, next) {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { name, icon, color } = req.body;

    const category = await IncomeCategory.findOne({ _id: id, userId });
    if (!category) {
      return res.status(404).json({ message: "Category not found or access denied" });
    }

    if (name) category.name = name.trim();
    if (icon) category.icon = icon;
    if (color) category.color = color;

    await category.save();

    return res.status(200).json({
      category: {
        id: category._id,
        name: category.name,
        icon: category.icon,
        color: category.color,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/income-categories/:id
 * Allows deleting user-specific income categories
 */
async function deleteIncomeCategory(req, res, next) {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const category = await IncomeCategory.findOneAndDelete({ _id: id, userId });
    if (!category) {
      return res.status(404).json({ message: "Category not found or access denied" });
    }

    return res.status(200).json({ message: "Category deleted successfully" });
  } catch (err) {
    next(err);
  }
}

module.exports = { getIncomeCategories, updateIncomeCategory, deleteIncomeCategory };
