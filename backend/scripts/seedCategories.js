/**
 * Seed default categories. Run: node scripts/seedCategories.js
 * Requires MONGODB_URI in .env
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const ExpenseCategory = require("../models/ExpenseCategory");
const IncomeCategory = require("../models/IncomeCategory");

const defaultExpenseCategories = [
  { name: "Food", icon: "🍕", color: "#F59E0B" },
  { name: "Transport", icon: "🚗", color: "#3B82F6" },
  { name: "Shopping", icon: "🛍️", color: "#EC4899" },
  { name: "Bills", icon: "💡", color: "#8B5CF6" },
  { name: "Fun", icon: "🎬", color: "#F97316" },
  { name: "Health", icon: "💊", color: "#059669" },
];

const defaultIncomeCategories = [
  { name: "Salary", icon: "💰", color: "#10B981" },
  { name: "Investments", icon: "📈", color: "#3B82F6" },
  { name: "Freelance", icon: "💻", color: "#8B5CF6" },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Seed Expense Categories
    for (const cat of defaultExpenseCategories) {
      await ExpenseCategory.findOneAndUpdate(
        { name: cat.name, userId: null },
        { $setOnInsert: { ...cat, userId: null } },
        { upsert: true }
      );
    }
    
    // Seed Income Categories
    for (const cat of defaultIncomeCategories) {
      await IncomeCategory.findOneAndUpdate(
        { name: cat.name, userId: null },
        { $setOnInsert: { ...cat, userId: null } },
        { upsert: true }
      );
    }
    
    console.log("✅ Categories seeded successfully");
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
