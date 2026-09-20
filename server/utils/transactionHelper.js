const mongoose = require('mongoose');

let _supportsTx = null;

async function checkTransactionSupport() {
  if (_supportsTx !== null) return _supportsTx;
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    _supportsTx = Boolean(hello.setName || hello.msg === 'isdbgrid');
  } catch {
    _supportsTx = false;
  }
  return _supportsTx;
}

/**
 * Executes a callback with a Mongoose session/transaction if supported by the MongoDB deployment.
 * If running on a standalone MongoDB instance (typical local setup), runs the callback with session = null.
 */
async function runWithTransaction(workFn) {
  const supports = await checkTransactionSupport();
  if (!supports) {
    return await workFn(null);
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await workFn(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    session.endSession();
  }
}

module.exports = { checkTransactionSupport, runWithTransaction };
