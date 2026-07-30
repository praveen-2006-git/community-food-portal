const express = require('express');
const router = express.Router();
const Ingredient = require('../models/Ingredient');
const Request = require('../models/Request');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

const APPROVED_CATEGORIES = ['Vegetables', 'Fruits', 'Bakery', 'Dairy', 'Grains', 'Meat', 'Canned Goods', 'Spices'];

// All routes here require user to be authenticated and have the 'donor' or 'admin' role
router.use(authenticateJWT);
router.use(authorizeRoles('donor', 'admin'));

// POST /api/ingredients - Upload/Create a new ingredient listing
router.post('/', authorizeRoles('donor'), async (req, res) => {
  try {
    const { name, category, quantity, unit, expiryDate, pickupDeadline, storageType, location, donorDeclaration } = req.body;

    const donorUser = await User.findById(req.user.id);
    if (!donorUser || donorUser.isActive === false) {
      return res.status(403).json({ message: 'Your account has been deactivated due to low reputation. Contact admin for review.' });
    }

    if (!name || !category || quantity === undefined || !unit || !expiryDate || !pickupDeadline || !storageType || !location) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (donorDeclaration !== true) {
      return res.status(400).json({ message: 'Donor declaration must be accepted to list the ingredient.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    const pickup = new Date(pickupDeadline);

    if (expiry.getTime() < today.getTime()) {
      return res.status(400).json({ message: 'Expiry date must be today or later.' });
    }

    if (pickup.getTime() > expiry.getTime()) {
      return res.status(400).json({ message: 'Pickup deadline must be on or before expiry date.' });
    }

    if (!APPROVED_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: `Invalid category. Must be one of: ${APPROVED_CATEGORIES.join(', ')}` });
    }

    if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return res.status(400).json({ message: 'Location lat and lng must be numbers.' });
    }

    const newIngredient = new Ingredient({
      name,
      category,
      quantity,
      unit,
      expiryDate,
      pickupDeadline,
      storageType,
      status: 'pending', // Default status is pending
      donorRef: req.user.id,
      location,
      donorDeclaration
    });

    await newIngredient.save();
    res.status(201).json(newIngredient);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Create ingredient error:', error);
    res.status(500).json({ message: 'Internal server error while creating ingredient.' });
  }
});

// GET /api/ingredients/my - Get all listings owned by the logged-in donor
router.get('/my', async (req, res) => {
  try {
    const ingredients = await Ingredient.find({ donorRef: req.user.id })
      .sort({ createdAt: -1 })
      .limit(200);
    res.status(200).json(ingredients);
  } catch (error) {
    console.error('Get my ingredients error:', error);
    res.status(500).json({ message: 'Internal server error while fetching listings.' });
  }
});

// PUT /api/ingredients/:id - Update an ingredient listing
router.put('/:id', async (req, res) => {
  try {
    const { name, category, quantity, unit, expiryDate, pickupDeadline, storageType, location, status } = req.body;
    
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) {
      return res.status(404).json({ message: 'Ingredient listing not found.' });
    }

    // Verify ownership (admins can bypass)
    if (ingredient.donorRef.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. You do not own this listing.' });
    }

    // Anti-malpractice constraint check
    if (req.user.role === 'donor') {
      if (expiryDate) {
        const incomingExpiry = new Date(expiryDate).getTime();
        const storedExpiry = new Date(ingredient.expiryDate).getTime();
        if (incomingExpiry !== storedExpiry) {
          return res.status(400).json({ message: 'Security Violation: Expiry and Pickup dates cannot be altered once logged.' });
        }
      }
      if (pickupDeadline) {
        const incomingPickup = new Date(pickupDeadline).getTime();
        const storedPickup = new Date(ingredient.pickupDeadline).getTime();
        if (incomingPickup !== storedPickup) {
          return res.status(400).json({ message: 'Security Violation: Expiry and Pickup dates cannot be altered once logged.' });
        }
      }
    }

    // Admin override for immutability
    if (req.user.role === 'admin') {
      const updateDoc = {};
      if (expiryDate) {
        const incomingExpiry = new Date(expiryDate).getTime();
        const storedExpiry = new Date(ingredient.expiryDate).getTime();
        if (incomingExpiry !== storedExpiry) {
          updateDoc.expiryDate = new Date(expiryDate);
        }
      }
      if (pickupDeadline) {
        const incomingPickup = new Date(pickupDeadline).getTime();
        const storedPickup = new Date(ingredient.pickupDeadline).getTime();
        if (incomingPickup !== storedPickup) {
          updateDoc.pickupDeadline = new Date(pickupDeadline);
        }
      }
      if (Object.keys(updateDoc).length > 0) {
        await Ingredient.collection.updateOne({ _id: ingredient._id }, { $set: updateDoc });
        console.log(`[Admin Override] Admin ${req.user.id} modified date(s) on ingredient ${ingredient._id}`);
        if (updateDoc.expiryDate) ingredient.expiryDate = updateDoc.expiryDate;
        if (updateDoc.pickupDeadline) ingredient.pickupDeadline = updateDoc.pickupDeadline;
      }
    }

    // Update fields if provided
    if (name) ingredient.name = name;
    if (category) {
      if (!APPROVED_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: `Invalid category. Must be one of: ${APPROVED_CATEGORIES.join(', ')}` });
      }
      ingredient.category = category;
    }
    if (quantity !== undefined) ingredient.quantity = quantity;
    if (unit) ingredient.unit = unit;
    
    // For donor role, Mongoose immutable will ignore date changes if they attempt it, 
    // but they are already blocked by the validation check above.
    // For admin role, we already updated direct db collection to bypass Mongoose immutable constraint.
    if (req.user.role === 'donor') {
      if (expiryDate) ingredient.expiryDate = expiryDate;
      if (pickupDeadline) ingredient.pickupDeadline = pickupDeadline;
    }

    if (storageType) ingredient.storageType = storageType;
    if (location) {
      if (typeof location.lat === 'number' && typeof location.lng === 'number') {
        ingredient.location = location;
      } else {
        return res.status(400).json({ message: 'Location lat and lng must be numbers.' });
      }
    }
    if (status) {
      if (['pending', 'approved', 'rejected', 'reserved', 'expired'].includes(status)) {
        ingredient.status = status;
      } else {
        return res.status(400).json({ message: 'Invalid status.' });
      }
    }

    await ingredient.save();
    const responseObj = ingredient.toObject();
    if (req.user.role === 'admin') {
      if (expiryDate) responseObj.expiryDate = new Date(expiryDate);
      if (pickupDeadline) responseObj.pickupDeadline = new Date(pickupDeadline);
    }
    res.status(200).json(responseObj);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Update ingredient error:', error);
    res.status(500).json({ message: 'Internal server error while updating ingredient.' });
  }
});

// DELETE /api/ingredients/:id - Delete an ingredient listing
router.delete('/:id', async (req, res) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) {
      return res.status(404).json({ message: 'Ingredient listing not found.' });
    }

    // Verify ownership (admin can bypass)
    if (ingredient.donorRef.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. You do not own this listing.' });
    }

    // Business Rule Check: Block deletion if ingredient has any reservedQuantity > 0
    // Get all requests associated with this ingredient
    const requests = await Request.find({ ingredientRef: req.params.id });
    const requestIds = requests.map(r => r._id);

    // Find any Reservation linked to these requests that has reservedQuantity > 0
    const activeReservations = await Reservation.find({
      requestRef: { $in: requestIds },
      reservedQuantity: { $gt: 0 }
    });

    if (activeReservations.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete ingredient: it has active reservations with reserved quantity greater than zero.'
      });
    }

    // No active reservations. Proceed to delete ingredient and associated Requests/Reservations
    await Ingredient.findByIdAndDelete(req.params.id);
    await Request.deleteMany({ ingredientRef: req.params.id });
    await Reservation.deleteMany({ requestRef: { $in: requestIds } });

    res.status(200).json({ message: 'Ingredient listing deleted successfully.' });
  } catch (error) {
    console.error('Delete ingredient error:', error);
    res.status(500).json({ message: 'Internal server error while deleting ingredient.' });
  }
});

module.exports = router;
