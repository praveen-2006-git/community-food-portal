const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI;
    await mongoose.connect(connStr);
    console.log(`MongoDB Connected successfully!`);

    // MongoDB transaction capability check on startup
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      await session.abortTransaction();
      console.log(`[DB Startup] MongoDB Transaction capability check: PASSED (transactions supported)`);
    } catch (txErr) {
      console.warn(`[DB Startup] MongoDB Transaction capability check: FAILED (transactions not supported). Running transactions might fail on this MongoDB configuration.`);
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error}`);
    process.exit(1);
  }
};

module.exports = connectDB;
