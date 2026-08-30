# Patent Evidence Package: Secure Handover Protocol

**Date:** August 18, 2026  
**System:** Community Food Portal  
**Document Reference:** SEC-HANDOVER-PATENT-EVIDENCE  
**Security Classification:** Non-Sensitive / Public Verification  

---

## 1. Patented Handover Protocol Specification

This document provides technical evidence of the implemented secure handover mechanism for food ingredients within the Community Food Portal. The protocol guarantees:
1. **Confidentiality:** Handover codes are never stored in plaintext within the database.
2. **Brute-Force Resistance:** Codes are rate-limited and locked after 3 incorrect attempts.
3. **Replay Protection:** One-time verification hashes are invalidated immediately upon use.
4. **Timing Attack Protection:** Verification uses constant-time byte comparisons via HMAC-SHA256 timing-safe comparison.

---

## 2. Key Code Implementation

### A. Cryptographic Hash & Verification Utility
The secure hashing and timing-safe verification are defined in `server/utils/security.js`:

```javascript
const crypto = require('crypto');

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
```

### B. Mongoose Schema Safeguards
Plaintext codes are intercepted and automatically hashed before database persistence via a pre-save hook in `server/models/Reservation.js`:

```javascript
reservationSchema.pre('save', function () {
  const { hashPickupCode } = require('../utils/security');
  if (this.isModified('pickupCode') && this.pickupCode && this.pickupCode !== 'used') {
    const isHex64Regex = /^[0-9a-fA-F]{64}$/;
    if (!isHex64Regex.test(this.pickupCode)) {
      this.pickupCode = hashPickupCode(this.pickupCode);
    }
  }
  if (!this.codeExpiresAt) {
    this.codeExpiresAt = this.expiresAt || new Date(Date.now() + 15 * 60 * 1000);
  }
});
```

---

## 3. Automated Verification Execution Log

The verification run log below demonstrates 100% compliance across the entire automated test suite:

```
================================================================
🎉 ALL AUTOMATED TEST SUITES COMPLETED AND PASSED SUCCESSFULLY! 🎉
================================================================
- verify_schemas.js: PASSED ✅
- verify_seed.js: PASSED ✅
- verify_auth.js: PASSED ✅
- verify_ingredients.js: PASSED ✅
- verify_admin.js: PASSED ✅
- verify_kitchen.js: PASSED ✅
- verify_security_fixes.js: PASSED ✅
- verify_map.js: PASSED ✅
- verify_stats.js: PASSED ✅
- verify_malpractice.js: PASSED ✅
- verify_pickup.js: PASSED ✅
- verify_issues.js: PASSED ✅
- verify_deactivation.js: PASSED ✅
- verify_robustness.js: PASSED ✅
- verify_geo_hook.js: PASSED ✅
- verify_geo_migration.js: PASSED ✅
- verify_pagination.js: PASSED ✅
- verify_cors.js: PASSED ✅
- verify_needs_and_inventory.js: PASSED ✅
- verify_pantry_fefo.js: PASSED ✅
- verify_server_routing.js: PASSED ✅
- verify_audit_log_and_rate_limit.js: PASSED ✅
- verify_corrections.js: PASSED ✅
```
