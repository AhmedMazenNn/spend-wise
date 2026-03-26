const mongoose = require("mongoose");

const expenseCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    icon: { type: String, default: "📦" },
    color: { type: String, default: "#10B981" },
  },
  { timestamps: true }
);

expenseCategorySchema.index({ name: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("ExpenseCategory", expenseCategorySchema);
