/**
 * Migration script to move categories from the old 'categories' collection 
 * to 'expensecategories' and 'incomecategories'.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const oldCategoriesColl = db.collection("categories");
    const expenseCategoriesColl = db.collection("expensecategories");
    const incomeCategoriesColl = db.collection("incomecategories");
    const expensesColl = db.collection("expenses");
    const incomesColl = db.collection("incomes");
    const categoryBudgetsColl = db.collection("categorybudgets");

    const oldCategories = await oldCategoriesColl.find({}).toArray();
    console.log(`Found ${oldCategories.length} old categories`);

    for (const cat of oldCategories) {
      const { _id, type, ...rest } = cat;
      
      if (type === "expense" || type === "both" || !type) {
        // Check if already exists in new collection by name and userId
        const existing = await expenseCategoriesColl.findOne({ name: cat.name, userId: cat.userId });
        let newId = _id;
        if (!existing) {
          console.log(`Moving ${cat.name} to ExpenseCategory`);
          await expenseCategoriesColl.insertOne({ ...rest, _id });
        } else {
          newId = existing._id;
        }
        // Update references in Expenses and CategoryBudgets
        await expensesColl.updateMany({ categoryId: _id }, { $set: { categoryId: newId } });
        await categoryBudgetsColl.updateMany({ categoryId: _id }, { $set: { categoryId: newId } });
      }

      if (type === "income" || type === "both") {
        // Check if already exists
        const existing = await incomeCategoriesColl.findOne({ name: cat.name, userId: cat.userId });
        let newId = _id;
        if (!existing) {
          console.log(`Moving ${cat.name} to IncomeCategory`);
          // If it was already moved to ExpenseCategory with same ID, we need a new ID for IncomeCategory
          // to avoid duplicate key error if we ever merge them again or for cleanliness.
          // But actually they are separate collections, so same ID is fine.
          await incomeCategoriesColl.insertOne({ ...rest, _id });
        } else {
          newId = existing._id;
        }
        // Update references in Incomes
        await incomesColl.updateMany({ categoryId: _id }, { $set: { categoryId: newId } });
      }
    }

    console.log("✅ Migration completed successfully");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

migrate();
