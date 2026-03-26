const mongoose = require("mongoose");

const incomeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    emoji: { type: String, default: "✨" },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "IncomeCategory", default: null },
    date: { type: Date, required: true },
    frequency: { type: String, enum: ["one-time", "weekly", "monthly", "yearly"], default: "one-time" },
    note: { type: String, default: null },
    status: { type: String, enum: ["received", "pending", "expected"], default: "received" },
  },
  { timestamps: true }
);

incomeSchema.index({ userId: 1 });
incomeSchema.index({ date: 1 });
incomeSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model("Income", incomeSchema);
