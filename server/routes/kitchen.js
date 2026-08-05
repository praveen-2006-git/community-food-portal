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

    const storageCaps = (req.user.storageCapabilities && req.user.storageCapabilities.length > 0)
      ? req.user.storageCapabilities
      : ['ambient', 'chilled', 'frozen'];

    const coords = (req.user.locationGeo && req.user.locationGeo.coordinates)
      ? req.user.locationGeo.coordinates
      : [kitchenLng || 0, kitchenLat || 0];

    const query = {
      status: 'approved',
      quantity: { $gt: 0 },
      donorRef: { $in: activeDonorIds },
      storageType: { $in: storageCaps },
      locationGeo: {
        $near: {
          $geometry: { type: 'Point', coordinates: [coords[0], coords[1]] },
          $maxDistance: parseInt(process.env.MAX_RADIUS_METRES) || 15000
        }
      }
    };

    const maxDistanceMetres = parseInt(process.env.MAX_RADIUS_METRES) || 15000;
    const earthRadiusMetres = 6378100;
    const countQuery = {
      status: 'approved',
      quantity: { $gt: 0 },
      donorRef: { $in: activeDonorIds },
      storageType: { $in: storageCaps },
      locationGeo: {
        $geoWithin: {
          $centerSphere: [
            [coords[0], coords[1]],
            maxDistanceMetres / earthRadiusMetres
          ]
        }
      }
    };

    if (req.query.dietaryType && ['veg', 'non-veg', 'egg'].includes(req.query.dietaryType)) {
      query.dietaryType = req.query.dietaryType;
      countQuery.dietaryType = req.query.dietaryType;
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

    // Check storage compatibility guard
    const caps = req.user.storageCapabilities || [];
    if (caps.length > 0 && !caps.includes(ingredientObj.storageType)) {
      return res.status(400).json({
        error: 'Storage mismatch',
        message: 'Your registered storage facilities cannot safely store this ingredient.'
      });
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
    const { deliveryStatus, receivedQuantity, condition } = req.body;

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

    if (deliveryStatus === 'delivered') {
      request.status = 'fulfilled';
      await request.save();

      const actualQty = typeof receivedQuantity === 'number' ? receivedQuantity : reservation.reservedQuantity;
      const cond = condition || 'good';

      reservation.receivedQuantity = actualQty;
      reservation.condition = cond;
      reservation.discrepancyLogged = actualQty !== reservation.reservedQuantity;
      await reservation.save();

      // Automatically add/increment this item in the kitchen user's inventory
      if (cond !== 'rejected') {
        const kitchen = await User.findById(req.user.id);
        if (kitchen) {
          const ingName = request.ingredientRef?.name || 'Surplus Item';
          const ingUnit = request.ingredientRef?.unit || 'units';

          const existingItem = kitchen.inventory.find(item => item.name.toLowerCase() === ingName.toLowerCase());
          if (existingItem) {
            existingItem.quantity = parseFloat((existingItem.quantity + actualQty).toFixed(2));
          } else {
            kitchen.inventory.push({
              name: ingName,
              quantity: actualQty,
              unit: ingUnit,
              minThreshold: 5 // Default min threshold
            });
          }
          await kitchen.save();
        }
      }

      // Automatically generate a Notification for the donor
      const Notification = require('../models/Notification');
      const donorNotification = new Notification({
        userRef: request.ingredientRef.donorRef,
        message: `Your donation of ${request.ingredientRef.name} has been successfully delivered! ${cond === 'rejected' ? 'However, the kitchen rejected the shipment.' : actualQty !== reservation.reservedQuantity ? `Received quantity: ${actualQty} ${request.ingredientRef.unit} (discrepancy logged).` : ''}`,
        isRead: false
      });
      await donorNotification.save();
    } else {
      await reservation.save();
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

// GET /api/kitchen/notifications
router.get('/notifications', authorizeRoles('soup_kitchen'), async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const notifications = await Notification.find({ userRef: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PUT /api/kitchen/notifications/:id/read
router.put('/notifications/:id/read', authorizeRoles('soup_kitchen'), async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userRef: req.user.id },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Weekly Needs Declaration endpoints
// GET /api/kitchen/needs
router.get('/needs', async (req, res) => {
  try {
    const WeeklyNeed = require('../models/WeeklyNeed');
    const needs = await WeeklyNeed.find({ soupKitchenRef: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(needs);
  } catch (error) {
    console.error('Fetch weekly needs error:', error);
    res.status(500).json({ message: 'Internal server error while fetching needs.' });
  }
});

// POST /api/kitchen/needs
router.post('/needs', async (req, res) => {
  try {
    const WeeklyNeed = require('../models/WeeklyNeed');
    const { ingredientName, quantity, unit, priority } = req.body;
    if (!ingredientName || !quantity || !unit) {
      return res.status(400).json({ message: 'Ingredient name, quantity, and unit are required.' });
    }

    // Check if a need with this ingredient name already exists for the kitchen
    let need = await WeeklyNeed.findOne({
      soupKitchenRef: req.user.id,
      ingredientName: { $regex: new RegExp(`^${ingredientName.trim()}$`, 'i') }
    });

    if (need) {
      need.quantity = parseFloat(quantity);
      need.unit = unit.trim();
      need.priority = priority || 'normal';
      await need.save();
      return res.status(200).json({ message: 'Weekly need updated successfully.', need });
    }

    need = new WeeklyNeed({
      soupKitchenRef: req.user.id,
      ingredientName: ingredientName.trim(),
      quantity: parseFloat(quantity),
      unit: unit.trim(),
      priority: priority || 'normal'
    });
    await need.save();
    res.status(201).json({ message: 'Weekly need declared successfully.', need });
  } catch (error) {
    console.error('Create/update weekly need error:', error);
    res.status(500).json({ message: 'Internal server error while declaring need.' });
  }
});

// DELETE /api/kitchen/needs/:id
router.delete('/needs/:id', async (req, res) => {
  try {
    const WeeklyNeed = require('../models/WeeklyNeed');
    const need = await WeeklyNeed.findOneAndDelete({ _id: req.params.id, soupKitchenRef: req.user.id });
    if (!need) {
      return res.status(404).json({ message: 'Weekly need declaration not found.' });
    }
    res.status(200).json({ message: 'Weekly need declaration deleted successfully.' });
  } catch (error) {
    console.error('Delete weekly need error:', error);
    res.status(500).json({ message: 'Internal server error while deleting need.' });
  }
});

// Kitchen Inventory endpoints
// GET /api/kitchen/inventory
router.get('/inventory', async (req, res) => {
  try {
    const kitchen = await User.findById(req.user.id).select('inventory');
    if (!kitchen) {
      return res.status(404).json({ message: 'Kitchen user not found.' });
    }
    res.status(200).json(kitchen.inventory || []);
  } catch (error) {
    console.error('Fetch kitchen inventory error:', error);
    res.status(500).json({ message: 'Internal server error while fetching inventory.' });
  }
});

// PUT /api/kitchen/inventory/consume - Log daily consumption
router.put('/inventory/consume', async (req, res) => {
  try {
    const { name, quantity } = req.body;
    if (!name || typeof quantity !== 'number' || quantity <= 0) {
      return res.status(400).json({ message: 'Ingredient name and positive quantity to consume are required.' });
    }

    const kitchen = await User.findById(req.user.id);
    if (!kitchen) {
      return res.status(404).json({ message: 'Kitchen user not found.' });
    }

    const item = kitchen.inventory.find(i => i.name.toLowerCase() === name.toLowerCase().trim());
    if (!item) {
      return res.status(404).json({ message: 'Ingredient not found in your inventory.' });
    }

    if (item.quantity < quantity) {
      return res.status(400).json({ message: `Insufficient stock. Current stock is ${item.quantity} ${item.unit}.` });
    }

    item.quantity = parseFloat((item.quantity - quantity).toFixed(2));
    await kitchen.save();

    res.status(200).json({ message: 'Consumption logged successfully.', inventory: kitchen.inventory });
  } catch (error) {
    console.error('Log consumption error:', error);
    res.status(500).json({ message: 'Internal server error while logging consumption.' });
  }
});

// PUT /api/kitchen/inventory/adjust - Manually adjust stock
router.put('/inventory/adjust', async (req, res) => {
  try {
    const { name, quantity, unit, minThreshold } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Ingredient name is required.' });
    }

    const kitchen = await User.findById(req.user.id);
    if (!kitchen) {
      return res.status(404).json({ message: 'Kitchen user not found.' });
    }

    let item = kitchen.inventory.find(i => i.name.toLowerCase() === name.toLowerCase().trim());

    if (item) {
      if (typeof quantity === 'number') item.quantity = parseFloat(quantity.toFixed(2));
      if (unit) item.unit = unit.trim();
      if (typeof minThreshold === 'number') item.minThreshold = minThreshold;
    } else {
      if (typeof quantity !== 'number' || !unit) {
        return res.status(400).json({ message: 'Quantity and unit are required for new inventory items.' });
      }
      item = {
        name: name.trim(),
        quantity: parseFloat(quantity.toFixed(2)),
        unit: unit.trim(),
        minThreshold: typeof minThreshold === 'number' ? minThreshold : 5
      };
      kitchen.inventory.push(item);
    }

    await kitchen.save();
    res.status(200).json({ message: 'Inventory adjusted successfully.', inventory: kitchen.inventory });
  } catch (error) {
    console.error('Adjust inventory error:', error);
    res.status(500).json({ message: 'Internal server error while adjusting inventory.' });
  }
});

module.exports = router;
