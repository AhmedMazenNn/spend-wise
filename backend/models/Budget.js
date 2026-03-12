const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, default: null },
    amount: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    warningThreshold: { type: Number, default: 70, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

budgetSchema.index({ userId: 1 });
budgetSchema.index({ startDate: 1 });
budgetSchema.index({ endDate: 1 });
budgetSchema.index({ userId: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model("Budget", budgetSchema);
