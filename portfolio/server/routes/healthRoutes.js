const express = require('express');
const router = express.Router();

// GET /api/v1/health — Liveness/version only, no secrets or database internals
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
