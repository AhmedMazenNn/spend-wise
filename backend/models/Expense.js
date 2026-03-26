const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "ExpenseCategory", required: true },
    amount: { type: Number, required: true, min: 0 },
    title: { type: String, required: true, trim: true },
    note: { type: String, default: null },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

expenseSchema.index({ userId: 1 });
expenseSchema.index({ date: 1 });
expenseSchema.index({ userId: 1, date: 1 });
expenseSchema.index({ categoryId: 1 });

module.exports = mongoose.model("Expense", expenseSchema);