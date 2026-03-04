const Category = require("../models/Category");

/**
 * GET /api/categories
 * Returns all categories for expense creation
 */
async function getCategories(req, res, next) {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();
    return res.status(200).json({
      categories: categories.map((c) => ({
        id: c._id,
        name: c.name,
        icon: c.icon,
        color: c.color,
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCategories };
