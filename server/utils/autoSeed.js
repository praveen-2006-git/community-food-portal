const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Ingredient = require('../models/Ingredient');

/**
 * Automatically populates essential demo users and initial surplus ingredients
 * if the database is brand new or empty.
 */
async function autoSeedIfEmpty() {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return; // Database already contains accounts
    }

    console.log('[AutoSeed] Empty database detected on startup. Initializing demo accounts...');

    const defaultPasswordHash = await bcrypt.hash('password123', 10);

    // 1. Create Default Demo Accounts
    const users = await User.create([
      {
        name: 'Local Supermarket (Demo)',
        email: 'donor1@portal.com',
        passwordHash: defaultPasswordHash,
        role: 'donor',
        location: { lat: 11.5160, lng: 77.2340 },
        reputationScore: 92,
        venueCategory: 'SUPERMARKET',
        contactPerson: 'Alice Donor',
        authorityToDonate: true
      },
      {
        name: 'Community Care Kitchen (Demo)',
        email: 'kitchen1@portal.com',
        passwordHash: defaultPasswordHash,
        role: 'soup_kitchen',
        location: { lat: 11.4950, lng: 77.2650 },
        storageCapabilities: ['cold', 'dry', 'ambient']
      },
      {
        name: 'System Administrator (Demo)',
        email: 'admin@portal.com',
        passwordHash: defaultPasswordHash,
        role: 'admin',
        location: { lat: 11.5034, lng: 77.2444 }
      }
    ]);

    const donor = users[0];

    // 2. Create Initial Available Surplus Ingredients
    const now = Date.now();
    await Ingredient.create([
      {
        name: 'Fresh Organic Spinach',
        category: 'vegetable',
        prepState: 'raw',
        dietaryType: 'veg',
        quantity: 25,
        unit: 'kg',
        expiryDate: new Date(now + 3 * 24 * 60 * 60 * 1000), // 3 days out
        pickupDeadline: new Date(now + 2 * 24 * 60 * 60 * 1000),
        storageType: 'Chilled',
        status: 'available',
        donorRef: donor._id,
        location: donor.location,
        donorDeclaration: true
      },
      {
        name: 'Whole Wheat Bread Loaves',
        category: 'bakery',
        prepState: 'packaged',
        dietaryType: 'veg',
        quantity: 40,
        unit: 'loaves',
        expiryDate: new Date(now + 2 * 24 * 60 * 60 * 1000),
        pickupDeadline: new Date(now + 1 * 24 * 60 * 60 * 1000),
        storageType: 'Dry',
        status: 'available',
        donorRef: donor._id,
        location: donor.location,
        donorDeclaration: true
      },
      {
        name: 'Farm Fresh Tomatoes',
        category: 'vegetable',
        prepState: 'raw',
        dietaryType: 'veg',
        quantity: 50,
        unit: 'kg',
        expiryDate: new Date(now + 4 * 24 * 60 * 60 * 1000),
        pickupDeadline: new Date(now + 3 * 24 * 60 * 60 * 1000),
        storageType: 'Ambient',
        status: 'available',
        donorRef: donor._id,
        location: donor.location,
        donorDeclaration: true
      }
    ]);

    console.log('[AutoSeed] Successfully seeded 3 demo users and 3 surplus batches for live exploration.');
  } catch (err) {
    console.warn('[AutoSeed] Seed skipped or encountered non-critical issue:', err.message);
  }
}

module.exports = { autoSeedIfEmpty };
