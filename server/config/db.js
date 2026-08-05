const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI;
    await mongoose.connect(connStr);
    console.log(`MongoDB Connected successfully!`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error}`);
    process.exit(1);
  }
};

module.exports = connectDB;
