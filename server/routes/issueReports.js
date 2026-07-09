const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Ingredient = require('../models/Ingredient');
const Request = require('../models/Request');
const Reservation = require('../models/Reservation');
const IssueReport = require('../models/IssueReport');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// All routes require user authentication
router.use(authenticateJWT);

// POST /api/issue-reports - Soup kitchen submits a report for a reservation
router.post('/', authorizeRoles('soup_kitchen'), async (req, res) => {
  try {
    const { reservationRef, reason, proofDescription } = req.body;

    if (!reservationRef || !reason) {
      return res.status(400).json({ message: 'Reservation reference and reason are required.' });
    }

    const reservation = await Reservation.findById(reservationRef);
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found.' });
    }

    const request = await Request.findById(reservation.requestRef).populate('ingredientRef');
    if (!request || !request.ingredientRef) {
      return res.status(404).json({ message: 'Associated request or ingredient not found.' });
    }

    // Verify ownership: only the soup kitchen that requested it can report an issue
    if (request.soupKitchenRef.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. You did not place this reservation.' });
    }

    // Verify reservation status is picked_up or delivered
    if (!['picked_up', 'delivered'].includes(reservation.deliveryStatus)) {
      return res.status(400).json({ message: 'Issue reports can only be submitted for picked up or delivered ingredients.' });
    }

    // Reject if a "pending" report already exists for this reservationRef
    const existingPendingReport = await IssueReport.findOne({ reservationRef, status: 'pending' });
    if (existingPendingReport) {
      return res.status(400).json({ message: 'A pending issue report already exists for this reservation.' });
    }

    const newReport = new IssueReport({
      reservationRef,
      ingredientRef: request.ingredientRef._id,
      reportedBy: req.user.id,
      reason,
      proofDescription,
      status: 'pending'
    });

    await newReport.save();
    res.status(201).json(newReport);
  } catch (error) {
    console.error('Create issue report error:', error);
    res.status(500).json({ message: 'Internal server error while creating issue report.' });
  }
});

// GET /api/issue-reports - Admin views all pending reports
router.get('/', authorizeRoles('admin'), async (req, res) => {
  try {
    const reports = await IssueReport.find({ status: 'pending' })
      .populate('reservationRef')
      .populate('ingredientRef')
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(reports);
  } catch (error) {
    console.error('Fetch issue reports error:', error);
    res.status(500).json({ message: 'Internal server error while fetching issue reports.' });
  }
});

// PUT /api/issue-reports/:id/resolve - Admin resolves a report (upheld/dismissed)
router.put('/:id/resolve', authorizeRoles('admin'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['upheld', 'dismissed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be upheld or dismissed.' });
    }

    const report = await IssueReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Issue report not found.' });
    }

    // Reject if not currently pending
    if (report.status !== 'pending') {
      return res.status(400).json({ message: 'This issue report has already been resolved.' });
    }

    report.status = status;

    if (status === 'upheld' && !report.reputationDeducted) {
      const ingredient = await Ingredient.findById(report.ingredientRef);
      if (ingredient) {
        const donor = await User.findById(ingredient.donorRef);
        if (donor) {
          donor.reputationScore = Math.max(0, donor.reputationScore - 15);
          if (donor.reputationScore < 40) {
            donor.isActive = false;
          }
          await donor.save();
          report.reputationDeducted = true;
          console.log(`[Admin Resolve] Deducted 15 points from donor ${donor.name} (${donor._id}). New score: ${donor.reputationScore}. Active: ${donor.isActive}`);
        }
      }
    }

    await report.save();
    res.status(200).json(report);
  } catch (error) {
    console.error('Resolve issue report error:', error);
    res.status(500).json({ message: 'Internal server error while resolving issue report.' });
  }
});

module.exports = router;
