const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Ingredient = require('../models/Ingredient');
const Request = require('../models/Request');
const Reservation = require('../models/Reservation');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// All routes require user authentication
router.use(authenticateJWT);

// GET /api/reservations/donor - Get all reservations for the logged-in donor's ingredients
router.get('/donor', authorizeRoles('donor'), async (req, res) => {
  try {
    // 1. Find all ingredients owned by this donor
    const myIngredients = await Ingredient.find({ donorRef: req.user.id });
    const ingredientIds = myIngredients.map(ing => ing._id);

    // 2. Find all requests for these ingredients
    const requests = await Request.find({ ingredientRef: { $in: ingredientIds } });
    const requestIds = requests.map(r => r._id);

    // 3. Find all reservations referencing these requests
    const reservations = await Reservation.find({ requestRef: { $in: requestIds } })
      .populate({
        path: 'requestRef',
        populate: {
          path: 'ingredientRef',
          select: 'name category unit donorRef pickupDeadline location'
        }
      })
      .sort({ createdAt: -1 });

    // 4. Sanitize: Remove pickupCode from response viewed by donor
    const sanitizedReservations = reservations.map(r => {
      const obj = r.toObject();
      delete obj.pickupCode;
      return obj;
    });

    res.status(200).json(sanitizedReservations);
  } catch (error) {
    console.error('Fetch donor reservations error:', error);
    res.status(500).json({ message: 'Internal server error while fetching donor reservations.' });
  }
});

// PUT /api/reservations/:id/verify-pickup - Verify 6-digit pickup code
router.put('/:id/verify-pickup', authorizeRoles('donor'), async (req, res) => {
  try {
    const { enteredCode } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid reservation ID format.' });
    }

    if (!enteredCode) {
      return res.status(400).json({ message: 'Entered pickup code is required.' });
    }

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found.' });
    }

    // Verify ownership: must belong to an ingredient owned by req.user
    const request = await Request.findById(reservation.requestRef).populate('ingredientRef');
    if (!request || !request.ingredientRef) {
      return res.status(404).json({ message: 'Associated request/ingredient not found.' });
    }

    if (request.ingredientRef.donorRef.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You do not own the ingredient for this reservation.' });
    }

    // Compare codes
    if (reservation.pickupCode !== enteredCode.toString().trim()) {
      return res.status(400).json({ message: 'Pickup code does not match. Do not release the ingredient.' });
    }

    // Set pickupConfirmedByDonor to true
    reservation.pickupConfirmedByDonor = true;
    await reservation.save();

    res.status(200).json({
      message: 'Pickup code verified successfully. You may now release the ingredient.',
      reservation: {
        _id: reservation._id,
        pickupConfirmedByDonor: reservation.pickupConfirmedByDonor,
        deliveryStatus: reservation.deliveryStatus
      }
    });

  } catch (error) {
    console.error('Verify pickup code error:', error);
    res.status(500).json({ message: 'Internal server error during pickup verification.' });
  }
});

// PUT /api/reservations/:id/delivery-status - General status update route accessible to donors, kitchens, and admin
router.put('/:id/delivery-status', authorizeRoles('donor', 'soup_kitchen', 'admin'), async (req, res) => {
  try {
    const { deliveryStatus } = req.body;

    if (!deliveryStatus || !['picked_up', 'delivered'].includes(deliveryStatus)) {
      return res.status(400).json({ message: 'Invalid delivery status. Must be picked_up or delivered.' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid reservation ID format.' });
    }

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found.' });
    }

    const request = await Request.findById(reservation.requestRef).populate('ingredientRef');
    if (!request || !request.ingredientRef) {
      return res.status(404).json({ message: 'Associated request/ingredient not found.' });
    }

    // Ownership check based on role
    if (req.user.role === 'donor') {
      if (request.ingredientRef.donorRef.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied. You do not own the ingredient for this reservation.' });
      }
    } else if (req.user.role === 'soup_kitchen') {
      if (request.soupKitchenRef.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied. You do not own this reservation.' });
      }
    }

    // Immutability checks for pickup confirmation
    if (deliveryStatus === 'picked_up' && !reservation.pickupConfirmedByDonor) {
      return res.status(400).json({ message: 'Pickup code has not been verified by the donor. Status transition to picked_up is blocked.' });
    }

    reservation.deliveryStatus = deliveryStatus;
    await reservation.save();

    if (deliveryStatus === 'delivered') {
      request.status = 'fulfilled';
      await request.save();

      // Automatically generate a Notification for the donor
      const Notification = require('../models/Notification');
      const donorNotification = new Notification({
        userRef: request.ingredientRef.donorRef,
        message: `Your donation of ${request.ingredientRef.name} has been successfully delivered!`,
        isRead: false
      });
      await donorNotification.save();
    }

    res.status(200).json({
      message: 'Reservation delivery status updated successfully.',
      reservation,
      requestStatus: request.status
    });

  } catch (error) {
    console.error('Update reservation status error:', error);
    res.status(500).json({ message: 'Internal server error while updating delivery status.' });
  }
});

module.exports = router;
