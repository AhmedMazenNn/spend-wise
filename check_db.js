const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    const Budget = mongoose.model('Budget', new mongoose.Schema({}, { strict: false }));
    const budget = await Budget.findOne({ isActive: true }).sort({ createdAt: -1 });
    console.log('Latest Active Budget:', JSON.stringify(budget, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
 Joe
