/**
 * Migration script to set default type for existing categories.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Category = require("../models/Category");

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Set type: 'expense' for all categories that don't have a type
    const result = await Category.updateMany(
      { type: { $exists: false } },
      { $set: { type: 'expense' } }
    );
    
    console.log(`✅ Migration successful: Updated ${result.modifiedCount} categories to type 'expense'.`);
    
    // Also ensure Salary, Investments, Freelance are set to 'income' if they were somehow created without it
    const incomeResult = await Category.updateMany(
      { name: { $in: ["Salary", "Investments", "Freelance", "Other Income"] }, type: { $ne: 'income' } },
      { $set: { type: 'income' } }
    );
    console.log(`✅ Updated ${incomeResult.modifiedCount} specialized income categories.`);

  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

migrate();
