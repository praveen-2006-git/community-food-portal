const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const res = await User.findOneAndUpdate(
    { email: 'donor1@portal.com' },
    { $set: { reputationScore: 100, isActive: true } },
    { new: true }
  );
  console.log('Restored Donor:', res.email, 'Reputation:', res.reputationScore, 'Active:', res.isActive);
  await mongoose.connection.close();
}

run().catch(console.error);
