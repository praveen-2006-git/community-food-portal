const express = require('express');
const { body, validationResult } = require('express-validator');
const { Inquiry, memoryInquiries } = require('../models/Inquiry');
const { getDBStatus } = require('../config/db');

const router = express.Router();

const validateContact = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters'),
];

router.post('/', validateContact, async (req, res, next) => {
  try {
    // Honeypot trap check
    if (req.body.website || req.body._hp) {
      return res.status(200).json({
        success: true,
        message: 'Inquiry submitted',
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { name, email, message } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || null;

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      ip,
      userAgent,
      status: 'new',
    };

    if (getDBStatus()) {
      try {
        await Inquiry.create(payload);
      } catch (dbErr) {
        console.warn('DB write error, saving to memory fallback:', dbErr.message);
        memoryInquiries.push({ ...payload, _id: `mem_${Date.now()}` });
      }
    } else {
      memoryInquiries.push({ ...payload, _id: `mem_${Date.now()}` });
    }

    return res.status(201).json({
      success: true,
      message: 'Inquiry submitted',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
