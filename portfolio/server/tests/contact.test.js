const request = require('supertest');
const app = require('../app');

describe('POST /api/contact — Inquiry Submission Tests', () => {
  it('should return 400 when email is invalid format', async () => {
    const res = await request(app).post('/api/contact').send({
      name: 'Engineering Recruiter',
      email: 'invalid-email-address',
      message: 'This is a test message to evaluate the developer portfolio.',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/contact').send({
      name: '',
      email: '',
      message: '',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should accept valid submission and return 201 with success message', async () => {
    const res = await request(app).post('/api/contact').send({
      name: 'Senior Engineering Manager',
      email: 'recruiter@techsystems.io',
      message: 'Hello Praveen, we reviewed your Mongoose transaction and HMAC architecture and want to invite you for an interview.',
    });

    expect([200, 201]).toContain(res.statusCode);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Inquiry submitted');
  });

  it('should trap honeypot submissions silently with 200', async () => {
    const res = await request(app).post('/api/contact').send({
      name: 'Spam Bot',
      email: 'bot@spamnetwork.com',
      message: 'Automated spam message for testing honeypot protection.',
      website: 'http://spam-payload.com',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Inquiry submitted');
  });
});
