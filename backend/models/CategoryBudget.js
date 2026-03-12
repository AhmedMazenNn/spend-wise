const mongoose = require("mongoose");

const categoryBudgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    amount: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

categoryBudgetSchema.index({ userId: 1, categoryId: 1, isActive: 1 });
categoryBudgetSchema.index({ userId: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model("CategoryBudget", categoryBudgetSchema);
