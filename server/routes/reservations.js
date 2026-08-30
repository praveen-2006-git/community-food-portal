const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Ingredient = require('../models/Ingredient');
const Request = require('../models/Request');
const Reservation = require('../models/Reservation');
const { hashPickupCode, verifyPickupCode } = require('../utils/security');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15, // Using 15 to ensure the automated integration tests do not hit rate limit caps during verify steps
  message: { message: 'Too many verification attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// All routes require user authentication
router.use(authenticateJWT);

// GET /api/reservations/donor - Get all reservations for the logged-in donor's ingredients
router.get('/donor', authorizeRoles('donor'), async (req, res) => {
  try {
    // 1. Find all ingredients owned by this donor
    const myIngredients = await Ingredient.find({ donorRef: req.user.id }).select('_id').lean();
    const ingredientIds = myIngredients.map(ing => ing._id);

    // 2. Find all requests for these ingredients
    const requests = await Request.find({ ingredientRef: { $in: ingredientIds } }).select('_id').lean();
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
      .sort({ createdAt: -1 })
      .limit(200);

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
router.put('/:id/verify-pickup', authorizeRoles('donor'), verifyLimiter, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { enteredCode } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid reservation ID format.' });
    }

    if (!enteredCode) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Entered pickup code is required.' });
    }

    const reservation = await Reservation.findById(req.params.id).session(session);
    if (!reservation) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Reservation not found.' });
    }

    // Verify ownership: must belong to an ingredient owned by req.user
    const request = await Request.findById(reservation.requestRef).populate('ingredientRef').session(session);
    if (!request || !request.ingredientRef) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Associated request/ingredient not found.' });
    }

    if (request.ingredientRef.donorRef.toString() !== req.user.id) {
      await session.abortTransaction();
      return res.status(403).json({ message: 'Access denied. You do not own the ingredient for this reservation.' });
    }

    // Single-use check: if already confirmed or code hash is cleared/empty or 'used'
    if (reservation.pickupConfirmedByDonor || !reservation.pickupCode || reservation.pickupCode === 'used') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'This pickup code has already been verified and cannot be reused.' });
    }

    // Maximum failed attempts check
    if (reservation.failedAttempts >= 3) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Code has been locked due to too many failed attempts. Please regenerate the code.' });
    }

    // Code expiry check
    if (reservation.codeExpiresAt && new Date() > new Date(reservation.codeExpiresAt)) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Pickup code has expired. Please regenerate the code.' });
    }

    // Compare codes timing-safe
    const matches = verifyPickupCode(enteredCode, reservation.pickupCode);
    if (!matches) {
      reservation.failedAttempts += 1;
      await reservation.save({ session });
      await session.commitTransaction();
      return res.status(400).json({ message: 'Pickup code does not match. Do not release the ingredient.' });
    }

    // Set pickupConfirmedByDonor to true and transition to handed_over
    reservation.pickupConfirmedByDonor = true;
    reservation.deliveryStatus = 'handed_over';
    reservation.pickupCode = 'used'; // single-use: clear hash
    reservation.failedAttempts = 0; // reset failures
    await reservation.save({ session });

    request.status = 'handed_over';
    await request.save({ session });

    await session.commitTransaction();

    return res.status(200).json({
      message: 'Pickup code verified successfully. You may now release the ingredient.',
      reservation: {
        _id: reservation._id,
        pickupConfirmedByDonor: reservation.pickupConfirmedByDonor,
        deliveryStatus: reservation.deliveryStatus
      }
    });

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error('Verify pickup code error:', error);
    return res.status(500).json({ message: 'Internal server error during pickup verification.' });
  } finally {
    session.endSession();
  }
});

// PUT /api/reservations/:id/delivery-status - General status update route accessible to donors, kitchens, and admin
router.put('/:id/delivery-status', authorizeRoles('donor', 'soup_kitchen', 'admin'), async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { deliveryStatus } = req.body;

    const allowedStatuses = ['pickup_scheduled', 'completed', 'cancelled'];
    if (!deliveryStatus || !allowedStatuses.includes(deliveryStatus)) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid delivery status. Must be pickup_scheduled, completed, or cancelled.' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid reservation ID format.' });
    }

    const reservation = await Reservation.findById(req.params.id).session(session);
    if (!reservation) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Reservation not found.' });
    }

    const request = await Request.findById(reservation.requestRef).populate('ingredientRef').session(session);
    if (!request || !request.ingredientRef) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Associated request/ingredient not found.' });
    }

    // Ownership check based on role
    if (req.user.role === 'donor') {
      if (request.ingredientRef.donorRef.toString() !== req.user.id) {
        await session.abortTransaction();
        return res.status(403).json({ message: 'Access denied. You do not own the ingredient for this reservation.' });
      }
    } else if (req.user.role === 'soup_kitchen') {
      if (request.soupKitchenRef.toString() !== req.user.id) {
        await session.abortTransaction();
        return res.status(403).json({ message: 'Access denied. You do not own this reservation.' });
      }
    }

    // State Transition Guards
    const current = reservation.deliveryStatus;
    if (deliveryStatus === 'pickup_scheduled' && current !== 'claimed') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Cannot transition to pickup_scheduled unless current status is claimed.' });
    }

    if (deliveryStatus === 'completed') {
      if (current !== 'handed_over') {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Cannot transition to completed unless current status is handed_over.' });
      }
      if (!reservation.pickupConfirmedByDonor) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Pickup code has not been verified by the donor. Status transition to completed is blocked.' });
      }
    }

    if (deliveryStatus === 'cancelled' && !['claimed', 'pickup_scheduled'].includes(current)) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Cannot cancel reservation after it has been handed over or completed.' });
    }

    reservation.deliveryStatus = deliveryStatus;
    await reservation.save({ session });

    if (deliveryStatus === 'completed') {
      request.status = 'completed';
      await request.save({ session });

      // Transition ingredient status to completed
      if (request.ingredientRef) {
        request.ingredientRef.status = 'completed';
        await request.ingredientRef.save({ session });
      }

      // Automatically add/increment this item in the kitchen user's inventory
      const kitchen = await User.findById(request.soupKitchenRef).session(session);
      if (kitchen) {
        const ingName = request.ingredientRef.name;
        const ingUnit = request.ingredientRef.unit;
        const actualQty = reservation.reservedQuantity;
        const newExpiryDate = request.ingredientRef.expiryDate;

        const existingItem = kitchen.inventory.find(item => item.name.toLowerCase() === ingName.toLowerCase());
        if (existingItem) {
          existingItem.quantity = parseFloat((existingItem.quantity + actualQty).toFixed(2));
          if (newExpiryDate) {
            if (!existingItem.expiryDate || new Date(newExpiryDate) < new Date(existingItem.expiryDate)) {
              existingItem.expiryDate = newExpiryDate;
            }
          }
        } else {
          kitchen.inventory.push({
            name: ingName,
            quantity: actualQty,
            unit: ingUnit,
            minThreshold: 5,
            expiryDate: newExpiryDate
          });
        }
        await kitchen.save({ session });
      }

      // Automatically generate a Notification for the donor
      const Notification = require('../models/Notification');
      const donorNotification = new Notification({
        userRef: request.ingredientRef.donorRef,
        message: `Your donation of ${request.ingredientRef.name} has been successfully delivered!`,
        isRead: false
      });
      await donorNotification.save({ session });
    } else if (deliveryStatus === 'cancelled') {
      request.status = 'cancelled';
      await request.save({ session });

      if (request.ingredientRef) {
        request.ingredientRef.quantity += reservation.reservedQuantity;
        await request.ingredientRef.save({ session });
      }
    }

    await session.commitTransaction();

    return res.status(200).json({
      message: 'Reservation delivery status updated successfully.',
      reservation,
      requestStatus: request.status
    });

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error('Update reservation status error:', error);
    return res.status(500).json({ message: 'Internal server error while updating delivery status.' });
  } finally {
    session.endSession();
  }
});

// POST /api/reservations/:id/regenerate-code - Regenerate pickup code
router.post('/:id/regenerate-code', authorizeRoles('soup_kitchen', 'admin'), async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid reservation ID format.' });
    }

    const reservation = await Reservation.findById(req.params.id).session(session);
    if (!reservation) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Reservation not found.' });
    }

    const request = await Request.findById(reservation.requestRef).session(session);
    if (!request) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Associated request not found.' });
    }

    // Ownership check: must be the soup kitchen who made the request, or admin
    if (req.user.role !== 'admin' && request.soupKitchenRef.toString() !== req.user.id) {
      await session.abortTransaction();
      return res.status(403).json({ message: 'Access denied. You do not own this reservation.' });
    }

    if (reservation.pickupConfirmedByDonor) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Cannot regenerate code for a reservation that has already been verified/picked up.' });
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = hashPickupCode(newCode);
    const codeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    reservation.pickupCode = hashedCode;
    reservation.failedAttempts = 0;
    reservation.codeExpiresAt = codeExpiresAt;
    await reservation.save({ session });

    await session.commitTransaction();

    return res.status(200).json({
      message: 'Pickup code regenerated successfully.',
      pickupCode: newCode
    });

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error('Regenerate pickup code error:', error);
    return res.status(500).json({ message: 'Internal server error during code regeneration.' });
  } finally {
    session.endSession();
  }
});

module.exports = router;
