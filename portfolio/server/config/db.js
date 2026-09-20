const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/praveen-portfolio';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });
    isConnected = true;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`MongoDB Connection Warning: ${error.message}. Running with in-memory persistence fallback.`);
    isConnected = false;
  }
};

const getDBStatus = () => isConnected;

module.exports = { connectDB, getDBStatus };
