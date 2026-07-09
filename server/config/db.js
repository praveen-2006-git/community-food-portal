const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/community_food_portal';
    await mongoose.connect(connStr);
    console.log(`MongoDB Connected successfully!`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
