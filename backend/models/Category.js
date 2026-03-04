const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    icon: { type: String, default: "" },
    color: { type: String, default: "#10B981" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
