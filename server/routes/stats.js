const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Ingredient = require('../models/Ingredient');
const Request = require('../models/Request');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// GET /api/stats/donor - Get live stats for the logged-in donor
router.get('/donor', authenticateJWT, authorizeRoles('donor'), async (req, res) => {
  try {
    // 1. Total ingredients listed by this donor
    const totalIngredients = await Ingredient.countDocuments({ donorRef: req.user.id });

    // 2. Total requests fulfilled for this donor's ingredients
    const myIngredients = await Ingredient.find({ donorRef: req.user.id }).select('_id').lean();
    const myIngredientIds = myIngredients.map(ing => ing._id);
    
    const totalFulfilled = await Request.countDocuments({
      ingredientRef: { $in: myIngredientIds },
      status: 'fulfilled'
    });

    // 3. Fetch donor's own reputation score
    const donorUser = await User.findById(req.user.id);
    const reputationScore = donorUser ? (donorUser.reputationScore || 0) : 0;

    res.status(200).json({
      totalIngredients,
      totalFulfilled,
      reputationScore,
      isActive: donorUser ? donorUser.isActive : true
    });
  } catch (error) {
    console.error('Fetch donor stats error:', error);
    res.status(500).json({ message: 'Internal server error while fetching donor statistics.' });
  }
});

// GET /api/stats/admin - Get live global stats for the admin dashboard
router.get('/admin', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    // 1. Total ingredients donated globally
    const totalIngredients = await Ingredient.countDocuments();

    // 2. Total requests fulfilled globally
    const totalFulfilled = await Request.countDocuments({ status: 'fulfilled' });

    // 3. Unique donors who have listed at least one ingredient
    const uniqueDonors = await Ingredient.distinct('donorRef');
    const activeDonors = uniqueDonors.length;

    // 4. Prevented waste tracker: sum of receivedQuantity/quantity on delivered reservations
    const Reservation = require('../models/Reservation');
    const deliveredReservations = await Reservation.find({ deliveryStatus: 'delivered' });
    const preventedWasteKg = deliveredReservations.reduce((acc, r) => acc + (r.receivedQuantity || r.quantity || 0), 0);

    // 5. Coverage gaps: kitchen weekly needs vs active approved listings
    const WeeklyNeed = require('../models/WeeklyNeed');
    const activeNeeds = await WeeklyNeed.find({});
    const approvedListings = await Ingredient.find({ status: 'approved' });

    const neededMap = {};
    activeNeeds.forEach(need => {
      const name = need.ingredientName.toLowerCase();
      neededMap[name] = (neededMap[name] || 0) + need.quantity;
    });

    const listingMap = {};
    approvedListings.forEach(ing => {
      const name = ing.name.toLowerCase();
      listingMap[name] = (listingMap[name] || 0) + ing.quantity;
    });

    const coverageGaps = [];
    for (const name in neededMap) {
      const needed = neededMap[name];
      const supplied = listingMap[name] || 0;
      if (supplied < needed) {
        coverageGaps.push({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          needed,
          supplied,
          gap: needed - supplied
        });
      }
    }

    // 6. Expiring items (expiry date in next 24 hours)
    const now = new Date();
    const next24 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const expiringCount = await Ingredient.countDocuments({
      status: 'approved',
      expiryDate: { $gte: now, $lte: next24 }
    });

    // 7. Uncollected logs (reservations flagged as 'expired' or 'rejected')
    const uncollectedCount = await Reservation.countDocuments({
      deliveryStatus: { $in: ['expired', 'rejected'] }
    });

    res.status(200).json({
      totalIngredients,
      totalFulfilled,
      activeDonors,
      preventedWasteKg,
      coverageGaps,
      expiringCount,
      uncollectedCount
    });
  } catch (error) {
    console.error('Fetch admin stats error:', error);
    res.status(500).json({ message: 'Internal server error while fetching admin statistics.' });
  }
});

module.exports = router;
