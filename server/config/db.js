const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  let connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/community_food_portal';
  try {
    await mongoose.connect(connStr);
    console.log(`MongoDB Connected successfully! (${connStr.includes('@') ? 'Cloud/Atlas' : 'Local'})`);
  } catch (primaryErr) {
    if (connStr !== 'mongodb://127.0.0.1:27017/community_food_portal') {
      console.warn(`Primary MongoDB URI connection failed (${primaryErr.message}). Retrying with local MongoDB...`);
      try {
        connStr = 'mongodb://127.0.0.1:27017/community_food_portal';
        await mongoose.connect(connStr);
        console.log(`Connected successfully to fallback local MongoDB!`);
      } catch (fallbackErr) {
        console.error(`MongoDB Connection Error: ${fallbackErr}`);
        process.exit(1);
      }
    } else {
      console.error(`MongoDB Connection Error: ${primaryErr}`);
      process.exit(1);
    }
  }

  // MongoDB transaction capability check on startup
  try {
    const { checkTransactionSupport } = require('../utils/transactionHelper');
    const supported = await checkTransactionSupport();
    if (supported) {
      console.log(`[DB Startup] MongoDB Transaction capability check: PASSED (Replica set / transactions supported)`);
    } else {
      console.log(`[DB Startup] Standalone MongoDB detected: atomic single-doc operations enabled with graceful multi-doc fallback.`);
    }
  } catch (err) {
    console.warn(`[DB Startup] Transaction check note: ${err.message}`);
  }
};

module.exports = connectDB;
