const rateLimit = require('express-rate-limit');

// General API Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});

// Strict Rate Limiter for Contact Submissions
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'test' ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many contact messages sent from this IP. Please try again after an hour or email directly.',
  },
});

// Strict Rate Limiter for HMAC Verification Simulator
const hmacDemoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many HMAC verification attempts. Please wait 15 minutes before retrying.',
  },
});

module.exports = {
  generalLimiter,
  contactLimiter,
  hmacDemoLimiter,
};
