/**
 * Seed default categories. Run: node scripts/seedCategories.js
 * Requires MONGODB_URI in .env
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Category = require("../models/Category");

const defaultCategories = [
  { name: "Food", icon: "🍕", color: "#F59E0B" },
  { name: "Transport", icon: "🚗", color: "#3B82F6" },
  { name: "Shopping", icon: "🛍️", color: "#EC4899" },
  { name: "Bills", icon: "💡", color: "#8B5CF6" },
  { name: "Fun", icon: "🎬", color: "#F97316" },
  { name: "Health", icon: "💊", color: "#059669" },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    for (const cat of defaultCategories) {
      await Category.findOneAndUpdate(
        { name: cat.name },
        { $setOnInsert: cat },
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
