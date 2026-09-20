const crypto = require('crypto');

// In-memory server-side attempt and lockout tracker
// In production, this can also be backed by Redis or MongoDB TTL collection
const attemptStore = new Map();
const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 900; // 15 minutes

const getDemoSecret = () => {
  return process.env.HMAC_SECRET || 'praveen_food_portal_demo_secret_key_2026';
};

/**
 * Computes an HMAC-SHA256 signature for a given payload
 */
const computeHmac = (token) => {
  const secret = getDemoSecret();
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
};

/**
 * GET /api/v1/demo/hmac/sample
 * Returns a valid token and signature generated with the server demo secret
 */
const getSampleHmac = (req, res) => {
  const token = req.query.token || 'food-claim-12345';
  const signature = computeHmac(token);

  res.json({
    success: true,
    token,
    signature,
    algorithm: 'HMAC-SHA256',
    maxAttempts: MAX_ATTEMPTS,
    lockoutDurationSeconds: LOCKOUT_SECONDS,
    note: 'Modify any hex character in the signature to test timing-safe verification and 3-attempt lockout behavior.',
  });
};

/**
 * POST /api/v1/demo/hmac/verify
 * Body: { "token": "food-claim-12345", "signature": "<64-char lowercase hex>" }
 */
const verifyHmac = (req, res) => {
  const { token, signature } = req.body;

  // 1. Basic input presence
  if (!token || typeof token !== 'string' || !signature || typeof signature !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Invalid payload: "token" (string) and "signature" (64-character hex string) are required.',
    });
  }

  // 2. Validate hex format and length (SHA-256 hex is exactly 64 chars)
  const hexRegex = /^[0-9a-fA-F]{64}$/;
  if (!hexRegex.test(signature)) {
    return res.status(400).json({
      success: false,
      message: 'Malformed signature: must be a valid 64-character hexadecimal string.',
    });
  }

  const trackingKey = `${token.trim()}`;
  const now = Date.now();
  const record = attemptStore.get(trackingKey) || { failedAttempts: 0, lockedUntil: 0 };

  // 3. Check for active lockout
  if (record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return res.status(423).json({
      success: false,
      message: 'Temporarily locked',
      retryAfterSeconds: remainingSeconds,
    });
  }

  // If previous lockout expired, reset failed attempts
  if (record.lockedUntil > 0 && record.lockedUntil <= now) {
    record.failedAttempts = 0;
    record.lockedUntil = 0;
  }

  // 4. Compute expected HMAC
  const expectedSignature = computeHmac(token);
  const expectedBuf = Buffer.from(expectedSignature, 'hex');
  const actualBuf = Buffer.from(signature.toLowerCase(), 'hex');

  // 5. Timing-safe comparison with strict buffer length check
  let isMatch = false;
  if (expectedBuf.length === actualBuf.length) {
    try {
      isMatch = crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch {
      isMatch = false;
    }
  }

  // 6. Handle Match vs Failure
  if (isMatch) {
    // Reset attempt tracking on success
    attemptStore.delete(trackingKey);
    return res.json({
      success: true,
      message: 'Token verified',
      remainingAttempts: MAX_ATTEMPTS,
    });
  } else {
    record.failedAttempts += 1;
    const remainingAttempts = Math.max(0, MAX_ATTEMPTS - record.failedAttempts);

    if (record.failedAttempts >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_SECONDS * 1000;
      attemptStore.set(trackingKey, record);
      return res.status(423).json({
        success: false,
        message: 'Temporarily locked',
        retryAfterSeconds: LOCKOUT_SECONDS,
      });
    }

    attemptStore.set(trackingKey, record);
    return res.status(401).json({
      success: false,
      message: 'Token invalid',
      remainingAttempts,
    });
  }
};

/**
 * Reset attempt store (used for test suites)
 */
const _resetStoreForTests = () => {
  attemptStore.clear();
};

module.exports = {
  getSampleHmac,
  verifyHmac,
  _resetStoreForTests,
};
