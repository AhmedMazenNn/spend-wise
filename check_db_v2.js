const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

async function check() {
  try {
    console.log('Connecting to:', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    
    // We use strict: false to see what's actually in the DB regardless of model
    const Budget = mongoose.model('Budget', new mongoose.Schema({}, { strict: false }));
    const budgets = await Budget.find({ isActive: true }).sort({ createdAt: -1 }).limit(5);
    
    console.log('Found budgets:', budgets.length);
    budgets.forEach((b, i) => {
      console.log(`Budget ${i}:`, JSON.stringify(b, null, 2));
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
 Joe
