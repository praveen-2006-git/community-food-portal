const request = require('supertest');
const crypto = require('crypto');
const app = require('../app');

describe('API Health and Demo Endpoints', () => {
  const secret = process.env.HMAC_SECRET || 'your-secret-key-change-in-production';

  describe('GET /api/health', () => {
    it('should return 200 with status ok and uptime', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.uptime).toBeDefined();
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('POST /api/demo/verify-hmac', () => {
    it('should verify valid HMAC signature successfully (success: true)', async () => {
      const token = 'food-claim-valid-1';
      const validSig = crypto.createHmac('sha256', secret).update(token).digest('hex');

      const res = await request(app).post('/api/demo/verify-hmac').send({
        token,
        signature: validSig,
        attempt: 1,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.locked).toBe(false);
    });

    it('should reject invalid HMAC signature (success: false)', async () => {
      const token = 'food-claim-invalid-test';
      const invalidSig = 'b'.repeat(64);

      const res = await request(app).post('/api/demo/verify-hmac').send({
        token,
        signature: invalidSig,
        attempt: 1,
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.locked).toBe(false);
    });

    it('should lock out after 3 failed attempts (locked: true)', async () => {
      const token = 'food-claim-lockout-token';
      const invalidSig = 'c'.repeat(64);

      // Attempt 1
      await request(app).post('/api/demo/verify-hmac').send({ token, signature: invalidSig });
      // Attempt 2
      await request(app).post('/api/demo/verify-hmac').send({ token, signature: invalidSig });
      // Attempt 3
      const res3 = await request(app).post('/api/demo/verify-hmac').send({ token, signature: invalidSig });

      expect(res3.statusCode).toBe(423);
      expect(res3.body.success).toBe(false);
      expect(res3.body.locked).toBe(true);
    });
  });

  describe('GET /api/demo/transaction-demo', () => {
    it('should return simulated transaction steps', async () => {
      const res = await request(app).get('/api/demo/transaction-demo');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.steps)).toBe(true);
      expect(res.body.steps.length).toBe(6);
    });
  });
});
