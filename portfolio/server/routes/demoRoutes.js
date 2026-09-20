const express = require('express');
const crypto = require('crypto');

const router = express.Router();

const getSecret = () => {
  return process.env.HMAC_SECRET || 'your-secret-key-change-in-production';
};

// In-memory failed attempts tracker per token
const attemptStore = new Map();

/**
 * Helper to compute valid HMAC for a token
 */
const computeHmac = (token) => {
  const secret = getSecret();
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
};

/**
 * GET /api/demo/generate-hmac
 * Generates a valid sample HMAC token & signature
 */
router.get('/generate-hmac', (req, res) => {
  const token = req.query.token || 'food-claim-12345';
  const signature = computeHmac(token);
  res.json({
    success: true,
    token,
    signature,
  });
});

/**
 * POST /api/demo/verify-hmac
 * Body: { token, signature, attempt }
 * Returns: { success, message, attempt, locked }
 */
router.post('/verify-hmac', (req, res) => {
  const { token, signature, attempt: clientAttempt } = req.body;

  if (!token || !signature) {
    return res.status(400).json({
      success: false,
      message: 'Token and signature are required',
      attempt: clientAttempt || 1,
      locked: false,
    });
  }

  const key = token.trim();
  const currentAttempts = (attemptStore.get(key) || 0) + 1;

  if (currentAttempts > 3) {
    return res.status(423).json({
      success: false,
      message: 'Maximum attempts exceeded. Account locked for 15 minutes.',
      attempt: currentAttempts,
      locked: true,
    });
  }

  // Validate hex format (64 chars)
  const hexRegex = /^[0-9a-fA-F]{64}$/;
  if (!hexRegex.test(signature)) {
    attemptStore.set(key, currentAttempts);
    return res.status(400).json({
      success: false,
      message: 'Malformed signature: must be 64-character hexadecimal',
      attempt: currentAttempts,
      locked: currentAttempts >= 3,
    });
  }

  const expectedSignature = computeHmac(token);
  const expectedBuf = Buffer.from(expectedSignature, 'hex');
  const actualBuf = Buffer.from(signature.toLowerCase(), 'hex');

  let isMatch = false;
  if (expectedBuf.length === actualBuf.length) {
    try {
      isMatch = crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch {
      isMatch = false;
    }
  }

  if (isMatch) {
    attemptStore.delete(key);
    return res.json({
      success: true,
      message: 'Signature verified successfully (200 OK)',
      attempt: currentAttempts,
      locked: false,
    });
  } else {
    attemptStore.set(key, currentAttempts);
    const locked = currentAttempts >= 3;
    return res.status(locked ? 423 : 401).json({
      success: false,
      message: locked
        ? 'Maximum verification attempts exceeded. Locked out.'
        : 'Signature verification failed (401 Unauthorized)',
      attempt: currentAttempts,
      locked,
    });
  }
});

/**
 * GET /api/demo/transaction-demo
 * Simulates 6-step ACID transaction lifecycle
 */
router.get('/transaction-demo', (req, res) => {
  const isFailureSimulation = req.query.fail === 'true';

  const steps = [
    {
      step: 1,
      action: 'Start Mongoose Session & Begin Transaction',
      status: 'success',
      details: 'session = await mongoose.startSession(); session.startTransaction();',
    },
    {
      step: 2,
      action: 'Query Surplus Batch with Read Isolation',
      status: 'success',
      details: 'FoodListing.findOne({ _id: batchId, status: "AVAILABLE" }).session(session)',
    },
    {
      step: 3,
      action: isFailureSimulation ? 'Stock Validation (Exhausted)' : 'Validate Stock Quantity',
      status: isFailureSimulation ? 'failed' : 'success',
      details: isFailureSimulation
        ? 'Error: Requested 15kg, Available: 0kg'
        : 'Available stock: 50kg >= Requested: 15kg',
    },
    {
      step: 4,
      action: isFailureSimulation ? 'Abort Transaction & Rollback' : 'Atomic Stock Decrement',
      status: isFailureSimulation ? 'rollback' : 'success',
      details: isFailureSimulation
        ? 'session.abortTransaction() invoked. Staged changes reverted.'
        : 'listing.availableQuantity -= 15; await listing.save({ session });',
    },
    {
      step: 5,
      action: isFailureSimulation ? 'Clean Session Termination' : 'Create Claim Record',
      status: isFailureSimulation ? 'aborted' : 'success',
      details: isFailureSimulation
        ? 'session.endSession(); return error response.'
        : 'Claim.create([{ listingId, kitchenId, status: "RESERVED" }], { session });',
    },
    {
      step: 6,
      action: isFailureSimulation ? 'Transaction Aborted Cleanly' : 'Commit Multi-Document Transaction',
      status: isFailureSimulation ? 'completed_abort' : 'success',
      details: isFailureSimulation
        ? 'Database state untouched. 0 partial writes.'
        : 'await session.commitTransaction(); session.endSession();',
    },
  ];

  res.json({
    success: true,
    failSimulated: isFailureSimulation,
    steps,
  });
});

module.exports = router;
