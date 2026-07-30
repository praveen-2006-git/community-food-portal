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

    res.status(200).json({
      totalIngredients,
      totalFulfilled,
      activeDonors
    });
  } catch (error) {
    console.error('Fetch admin stats error:', error);
    res.status(500).json({ message: 'Internal server error while fetching admin statistics.' });
  }
});

module.exports = router;
