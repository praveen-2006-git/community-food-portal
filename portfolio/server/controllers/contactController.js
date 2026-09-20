const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { Inquiry, memoryInquiries } = require('../models/Inquiry');
const { getDBStatus } = require('../config/db');

// Helper to hash IP with salt for privacy-conscious abuse prevention
const hashIP = (ip) => {
  if (!ip) return null;
  const salt = process.env.HMAC_SECRET || 'praveen_default_salt';
  return crypto.createHmac('sha256', salt).update(ip).digest('hex').substring(0, 16);
};

const handleContactSubmission = async (req, res, next) => {
  try {
    // 1. Honeypot check for bots
    if (req.body.website || req.body._hp) {
      // Silently return success to bot without saving
      return res.status(200).json({
        success: true,
        message: 'Message received successfully.',
      });
    }

    // 2. Validation check
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { name, email, message } = req.body;
    const clientIP = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ipHash = hashIP(clientIP);

    const inquiryPayload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      status: 'unread',
      ipHash,
      submittedAt: new Date(),
    };

    // 3. Persist inquiry (MongoDB or Memory fallback)
    if (getDBStatus()) {
      try {
        await Inquiry.create(inquiryPayload);
      } catch (dbErr) {
        console.warn('[Contact] MongoDB save error, falling back to memory:', dbErr.message);
        memoryInquiries.push({ ...inquiryPayload, _id: `mem_${Date.now()}` });
      }
    } else {
      memoryInquiries.push({ ...inquiryPayload, _id: `mem_${Date.now()}` });
    }

    return res.status(201).json({
      success: true,
      message: 'Thank you for reaching out! Your message has been sent successfully.',
      data: {
        submittedAt: inquiryPayload.submittedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  handleContactSubmission,
};
