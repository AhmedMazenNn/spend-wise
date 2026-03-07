const Category = require("../models/Category");

/**
 * GET /api/categories
 * Returns all categories for expense creation
 */
async function getCategories(req, res, next) {
  try {
    const userId = req.user._id;
    const categories = await Category.find({
      $or: [{ userId: null }, { userId }],
    })
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
 * PATCH /api/categories/:id
 * Allows updating user-specific categories
 */
async function updateCategory(req, res, next) {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { name, icon, color } = req.body;

    const category = await Category.findOne({ _id: id, userId });
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
 * DELETE /api/categories/:id
 * Allows deleting user-specific categories
 */
async function deleteCategory(req, res, next) {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const category = await Category.findOneAndDelete({ _id: id, userId });
    if (!category) {
      return res.status(404).json({ message: "Category not found or access denied" });
    }

    return res.status(200).json({ message: "Category deleted successfully" });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCategories, updateCategory, deleteCategory };
