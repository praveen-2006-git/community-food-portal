const crypto = require('crypto');

// Ensure a secure secret is populated for tests if not provided
if (process.env.NODE_ENV === 'test' && !process.env.PICKUP_CODE_SECRET) {
  process.env.PICKUP_CODE_SECRET = 'test_pickup_code_secret_key_32_characters_long_or_more';
}

function getSecret() {
  const secret = process.env.PICKUP_CODE_SECRET;
  if (!secret) {
    throw new Error('PICKUP_CODE_SECRET environment variable is missing.');
  }
  if (secret.length < 32) {
    throw new Error('PICKUP_CODE_SECRET must be at least 32 characters long.');
  }
  return secret;
}

function hashPickupCode(code) {
  const secret = getSecret();
  return crypto.createHmac('sha256', secret).update(code.toString().trim()).digest('hex');
}

function verifyPickupCode(enteredCode, storedHash) {
  if (!enteredCode || !storedHash) return false;
  const computedHash = hashPickupCode(enteredCode);
  const computedBuf = Buffer.from(computedHash, 'hex');
  const storedBuf = Buffer.from(storedHash, 'hex');
  if (computedBuf.length !== storedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(computedBuf, storedBuf);
}

module.exports = {
  hashPickupCode,
  verifyPickupCode
};
