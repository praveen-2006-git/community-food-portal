const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_12345';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, location, storageCapabilities } = req.body;

    // Validate request body
    if (!name || !email || !password || !role || !location) {
      return res.status(400).json({ message: 'All fields (name, email, password, role, location) are required.' });
    }

    if (!['donor', 'soup_kitchen', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be donor, soup_kitchen, or admin.' });
    }

    if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return res.status(400).json({ message: 'Location lat and lng must be numbers.' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({
      name,
      email,
      passwordHash,
      role,
      location,
      reputationScore: role === 'donor' ? 100 : undefined,
      storageCapabilities: role === 'soup_kitchen' ? (storageCapabilities || []) : undefined
    });

    await newUser.save();

    // Create token
    const token = jwt.sign(
      { 
        id: newUser._id, 
        email: newUser.email, 
        role: newUser.role, 
        location: newUser.location,
        locationGeo: newUser.locationGeo || { type: 'Point', coordinates: [newUser.location.lng, newUser.location.lat] },
        storageCapabilities: newUser.storageCapabilities || []
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        location: newUser.location,
        reputationScore: newUser.reputationScore,
        isActive: newUser.isActive,
        storageCapabilities: newUser.storageCapabilities
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Create token
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role, 
        location: user.location,
        locationGeo: user.locationGeo || { type: 'Point', coordinates: [user.location.lng, user.location.lat] },
        storageCapabilities: user.storageCapabilities || []
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        reputationScore: user.reputationScore,
        isActive: user.isActive,
        storageCapabilities: user.storageCapabilities || []
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login.' });
  }
});

const { authenticateJWT } = require('../middleware/auth');

// PUT /api/auth/profile
router.put('/profile', authenticateJWT, async (req, res) => {
  try {
    const { typicalDonationSchedule, preferredPickupWindow, typicalIngredientCategories, storageCapabilities } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (typicalDonationSchedule !== undefined) user.typicalDonationSchedule = typicalDonationSchedule;
    if (preferredPickupWindow !== undefined) user.preferredPickupWindow = preferredPickupWindow;
    if (typicalIngredientCategories !== undefined) user.typicalIngredientCategories = typicalIngredientCategories;
    if (storageCapabilities !== undefined) user.storageCapabilities = storageCapabilities;

    await user.save();
    res.status(200).json({
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        reputationScore: user.reputationScore,
        isActive: user.isActive,
        storageCapabilities: user.storageCapabilities || [],
        typicalDonationSchedule: user.typicalDonationSchedule || [],
        preferredPickupWindow: user.preferredPickupWindow || '',
        typicalIngredientCategories: user.typicalIngredientCategories || []
      }
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Internal server error while updating profile.' });
  }
});

module.exports = router;
