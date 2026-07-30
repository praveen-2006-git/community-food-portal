const express = require('express');
const router = express.Router();
const Ingredient = require('../models/Ingredient');
const QualityReport = require('../models/QualityReport');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// All routes require user to be authenticated and have the 'admin' role
router.use(authenticateJWT);
router.use(authorizeRoles('admin'));

// GET /api/admin/ingredients/pending - List all ingredients with status = pending
router.get('/ingredients/pending', async (req, res) => {
  try {
    const pendingIngredients = await Ingredient.find({ status: 'pending' })
      .populate('donorRef', 'name email reputationScore')
      .sort({ createdAt: -1 })
      .limit(200);
    res.status(200).json(pendingIngredients);
  } catch (error) {
    console.error('Fetch pending ingredients error:', error);
    res.status(500).json({ message: 'Internal server error while fetching pending ingredients.' });
  }
});

// POST /api/admin/ingredients/:id/approve - Approve a pending ingredient and create quality report
router.post('/ingredients/:id/approve', async (req, res) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) {
      return res.status(404).json({ message: 'Ingredient not found.' });
    }

    if (ingredient.status !== 'pending') {
      return res.status(400).json({ message: `Cannot approve ingredient. Current status is: ${ingredient.status}` });
    }

    const now = new Date();
    if (ingredient.expiryDate < now) {
      ingredient.status = 'expired';
      await ingredient.save();
      return res.status(400).json({ message: 'Cannot approve ingredient: the expiry date has already passed. The listing has been marked as expired.' });
    }

    // Create QualityReport defaulting all fields to true (based on donor self-declaration)
    const qualityReport = new QualityReport({
      ingredientRef: ingredient._id,
      packagingIntact: true,
      expiryValid: true,
      noFoulSmell: true,
      properStorage: true,
      noLeakage: true,
      quantityVerified: true,
      verifiedBy: req.user.id,
      verifiedAt: new Date()
    });

    await qualityReport.save();

    // Set status to approved
    ingredient.status = 'approved';
    await ingredient.save();

    // Create AuditLog entry
    const auditLog = new AuditLog({
      adminRef: req.user.id,
      action: 'approve_ingredient',
      targetId: ingredient._id,
      details: `Approved ingredient: ${ingredient.name}`
    });
    await auditLog.save();

    res.status(200).json({
      message: 'Ingredient approved successfully and quality report created.',
      ingredient,
      qualityReport
    });
  } catch (error) {
    console.error('Approve ingredient error:', error);
    res.status(500).json({ message: 'Internal server error during ingredient approval.' });
  }
});

// POST /api/admin/ingredients/:id/reject - Reject a pending ingredient and deduct reputation points
router.post('/ingredients/:id/reject', async (req, res) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) {
      return res.status(404).json({ message: 'Ingredient not found.' });
    }

    if (ingredient.status !== 'pending') {
      return res.status(400).json({ message: `Cannot reject ingredient. Current status is: ${ingredient.status}` });
    }

    // Update status to rejected
    ingredient.status = 'rejected';
    await ingredient.save();

    // Deduct reputation score from donor
    const donor = await User.findById(ingredient.donorRef);
    let newScore = 0;
    if (donor) {
      donor.reputationScore = Math.max(0, (donor.reputationScore || 0) - 5);
      newScore = donor.reputationScore;
      if (newScore < 40) {
        donor.isActive = false;
      }
      await donor.save();
    }

    // Create AuditLog entry
    const auditLog = new AuditLog({
      adminRef: req.user.id,
      action: 'reject_ingredient',
      targetId: ingredient._id,
      details: `Rejected ingredient: ${ingredient.name}. Deducted 5 reputation points.`
    });
    await auditLog.save();

    res.status(200).json({
      message: 'Ingredient rejected successfully and 5 points deducted from donor reputation score.',
      ingredient,
      donorReputationScore: newScore,
      donorIsActive: donor ? donor.isActive : true
    });
  } catch (error) {
    console.error('Reject ingredient error:', error);
    res.status(500).json({ message: 'Internal server error during ingredient rejection.' });
  }
});

// GET /api/admin/donors/deactivated - Get all deactivated donors
router.get('/donors/deactivated', async (req, res) => {
  try {
    const deactivated = await User.find({ role: 'donor', isActive: false })
      .select('-passwordHash')
      .limit(200);
    res.status(200).json(deactivated);
  } catch (error) {
    console.error('Fetch deactivated donors error:', error);
    res.status(500).json({ message: 'Internal server error while fetching deactivated donors.' });
  }
});

// PUT /api/admin/donors/:id/reactivate - Reactivate a deactivated donor
router.put('/donors/:id/reactivate', async (req, res) => {
  try {
    const donor = await User.findById(req.params.id);
    if (!donor) {
      return res.status(404).json({ message: 'Donor not found.' });
    }
    donor.isActive = true;
    donor.reputationScore = 60;
    await donor.save();

    // Create AuditLog entry
    const auditLog = new AuditLog({
      adminRef: req.user.id,
      action: 'reactivate_donor',
      targetId: donor._id,
      details: `Reactivated donor: ${donor.name}. Reset reputation score to 60.`
    });
    await auditLog.save();

    res.status(200).json({ message: 'Donor reactivated successfully.', donor });
  } catch (error) {
    console.error('Reactivate donor error:', error);
    res.status(500).json({ message: 'Internal server error while reactivating donor.' });
  }
});

// GET /api/admin/kitchens - Get all registered soup kitchens for mapping
router.get('/kitchens', async (req, res) => {
  try {
    const kitchens = await User.find({ role: 'soup_kitchen' }).select('name email location');
    res.status(200).json(kitchens);
  } catch (error) {
    console.error('Fetch kitchens error:', error);
    res.status(500).json({ message: 'Internal server error while fetching kitchens.' });
  }
});
// GET /api/admin/network-ledger - Get all users and reputation scores for the admin ledger
router.get('/network-ledger', async (req, res) => {
  try {
    const isPaginated = req.query.page !== undefined || req.query.limit !== undefined;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { role: { $in: ['donor', 'soup_kitchen'] } };
    const total = await User.countDocuments(query);
    
    let queryExec = User.find(query)
                        .select('name role reputationScore email')
                        .sort({ reputationScore: -1, _id: 1 });
    
    if (isPaginated) {
      queryExec = queryExec.skip(skip).limit(limit);
    }
    
    const users = await queryExec.lean();
    
    if (isPaginated) {
      res.status(200).json({
        docs: users,
        total,
        page,
        pages: Math.ceil(total / limit)
      });
    } else {
      res.status(200).json(users);
    }
  } catch (error) {
    console.error("Error fetching network ledger:", error);
    res.status(500).json({ message: "Failed to fetch reputation ledger" });
  }
});

module.exports = router;
