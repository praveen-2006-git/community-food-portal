const express = require('express');
const router = express.Router();

// Minimized in-memory event bucket
const eventCounters = {
  project_views: {},
  resume_downloads: 0,
  sandbox_runs: 0,
};

// POST /api/v1/telemetry/events — Anonymous aggregate counters
router.post('/events', (req, res) => {
  const { event, projectId } = req.body || {};

  if (event === 'project_view' && projectId) {
    eventCounters.project_views[projectId] = (eventCounters.project_views[projectId] || 0) + 1;
  } else if (event === 'resume_download') {
    eventCounters.resume_downloads += 1;
  } else if (event === 'sandbox_run') {
    eventCounters.sandbox_runs += 1;
  }

  res.status(202).json({ success: true });
});

module.exports = router;
