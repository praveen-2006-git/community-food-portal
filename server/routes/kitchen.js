const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Ingredient = require('../models/Ingredient');
const Request = require('../models/Request');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// All routes require user to be authenticated and have the 'soup_kitchen' or 'admin' role
router.use(authenticateJWT);
router.use(authorizeRoles('soup_kitchen', 'admin'));

// Helper: Haversine distance formula (in km)
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// GET /api/kitchen/ingredients - View approved ingredients, sorted by distance (nearest first)
router.get('/ingredients', async (req, res) => {
  try {
    const kitchenLat = req.user.location?.lat;
    const kitchenLng = req.user.location?.lng;

    const isPaginated = req.query.page !== undefined || req.query.limit !== undefined;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch active donor IDs to filter deactivated users in DB query
    const activeDonors = await User.find({ role: 'donor', isActive: { $ne: false } }).select('_id').lean();
    const activeDonorIds = activeDonors.map(d => d._id);

    const query = {
      status: 'approved',
      quantity: { $gt: 0 },
      donorRef: { $in: activeDonorIds }
    };

    // Separate geo query from counting query to prevent countDocuments aggregation restrictions on $near
    const countQuery = { ...query };

    if (kitchenLat !== undefined && kitchenLng !== undefined) {
      query.locationGeo = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [kitchenLng, kitchenLat]
          }
        }
      };
    }

    const total = await Ingredient.countDocuments(countQuery);
    let queryExec = Ingredient.find(query).populate('donorRef', 'name email reputationScore isActive');
    
    if (isPaginated) {
      queryExec = queryExec.skip(skip).limit(limit);
    }
    
    const ingredients = await queryExec.lean();

    // Map ingredients to include calculated Haversine distance if coordinates are available
    const ingredientsWithDistance = ingredients.map(ing => {
      let dist = null;
      if (kitchenLat !== undefined && kitchenLng !== undefined && ing.location) {
        dist = getHaversineDistance(kitchenLat, kitchenLng, ing.location.lat, ing.location.lng);
      }
      return {
        ...ing,
        distance: dist !== null ? parseFloat(dist.toFixed(3)) : null
      };
    });

    if (isPaginated) {
      res.status(200).json({
        docs: ingredientsWithDistance,
        total,
        page,
        pages: Math.ceil(total / limit)
      });
    } else {
      res.status(200).json(ingredientsWithDistance);
    }
  } catch (error) {
    console.error('Fetch kitchen ingredients error:', error);
    res.status(500).json({ message: 'Internal server error while fetching ingredients.' });
  }
});

// POST /api/kitchen/ingredients/:id/request - Request specific quantity of an ingredient
router.post('/ingredients/:id/request', async (req, res) => {
  try {
    const { requestedQuantity, pickupMode, volunteerName } = req.body;

    if (requestedQuantity === undefined || !pickupMode) {
      return res.status(400).json({ message: 'Requested quantity and pickup mode are required.' });
    }

    if (requestedQuantity <= 0) {
      return res.status(400).json({ message: 'Requested quantity must be greater than zero.' });
    }

    if (!['self', 'volunteer'].includes(pickupMode)) {
      return res.status(400).json({ message: 'Pickup mode must be self or volunteer.' });
    }

    if (pickupMode === 'volunteer' && !volunteerName) {
      return res.status(400).json({ message: 'Volunteer name is required when pickup mode is volunteer.' });
    }

    const ingredientId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(ingredientId)) {
      return res.status(400).json({ message: 'Invalid ingredient ID format.' });
    }

    const ingredientObj = await Ingredient.findById(ingredientId);
    if (!ingredientObj) {
      return res.status(404).json({ message: 'Ingredient not found.' });
    }

    const donorUser = await User.findById(ingredientObj.donorRef);
    if (donorUser && donorUser.isActive === false) {
      return res.status(403).json({ message: 'Your request cannot be completed: the donor account is deactivated.' });
    }

    // ATOMIC UPDATE to prevent race conditions
    // Atomically decrement quantity ONLY if current quantity is >= requestedQuantity and status is 'approved'
    const updatedIngredient = await Ingredient.findOneAndUpdate(
      {
        _id: ingredientId,
        status: 'approved',
        quantity: { $gte: requestedQuantity }
      },
      {
        $inc: { quantity: -requestedQuantity }
      },
      {
        new: true // Return updated document
      }
    );

    if (!updatedIngredient) {
      return res.status(400).json({
        message: 'Requested quantity is not available, or the ingredient is no longer active/approved.'
      });
    }

    // If quantity is now 0, flip status to 'reserved'
    if (updatedIngredient.quantity === 0) {
      updatedIngredient.status = 'reserved';
      await updatedIngredient.save({ validateBeforeSave: false });
    }

    // Create Request
    const request = new Request({
      soupKitchenRef: req.user.id,
      ingredientRef: ingredientId,
      requestedQuantity,
      status: 'reserved', // Requested items start as reserved
      pickupMode,
      volunteerName: pickupMode === 'volunteer' ? volunteerName : ''
    });
    await request.save();

    const pickupCode = Math.floor(100000 + Math.random() * 900000).toString();
    const reservation = new Reservation({
      requestRef: request._id,
      reservedQuantity: requestedQuantity,
      expiresAt: updatedIngredient.pickupDeadline,
      deliveryStatus: 'pending',
      pickupCode,
      pickupConfirmedByDonor: false
    });
    await reservation.save();

    res.status(201).json({
      message: 'Request created and ingredient reserved successfully.',
      request,
      reservation,
      remainingQuantity: updatedIngredient.quantity,
      ingredientStatus: updatedIngredient.status
    });

  } catch (error) {
    console.error('Request ingredient error:', error);
    res.status(500).json({ message: 'Internal server error during request placement.' });
  }
});

// GET /api/kitchen/reservations - Get all reservations for the logged-in kitchen's requests
router.get('/reservations', async (req, res) => {
  try {
    const requests = await Request.find({ soupKitchenRef: req.user.id }).select('_id').lean();
    const requestIds = requests.map(r => r._id);

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

    res.status(200).json(reservations);
  } catch (error) {
    console.error('Fetch reservations error:', error);
    res.status(500).json({ message: 'Internal server error while fetching reservations.' });
  }
});

// PUT /api/kitchen/reservations/:id/delivery-status - Update delivery status (pending -> picked_up -> delivered)
router.put('/reservations/:id/delivery-status', async (req, res) => {
  try {
    const { deliveryStatus } = req.body;

    if (!deliveryStatus || !['picked_up', 'delivered'].includes(deliveryStatus)) {
      return res.status(400).json({ message: 'Invalid delivery status. Must be picked_up or delivered.' });
    }

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found.' });
    }

    const request = await Request.findById(reservation.requestRef).populate('ingredientRef');
    if (!request) {
      return res.status(404).json({ message: 'Associated request not found.' });
    }

    if (request.soupKitchenRef.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. You do not own this reservation.' });
    }

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
