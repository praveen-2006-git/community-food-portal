const express = require('express');
const { getAnalytics } = require('../controllers/adminController');

const router = express.Router();

// GET /api/v1/admin/analytics — Authenticated admin-only aggregate metrics
router.get('/analytics', getAnalytics);

module.exports = router;
