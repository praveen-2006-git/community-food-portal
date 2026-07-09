const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');

// Import all 6 models
const User = require('./models/User');
const Ingredient = require('./models/Ingredient');
const Request = require('./models/Request');
const Reservation = require('./models/Reservation');
const QualityReport = require('./models/QualityReport');
const Notification = require('./models/Notification');

const seedData = async () => {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Clear all 6 collections
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Ingredient.deleteMany({});
    await Request.deleteMany({});
    await Reservation.deleteMany({});
    await QualityReport.deleteMany({});
    await Notification.deleteMany({});
    console.log('All collections cleared successfully.');

    // 3. Hash password
    const passwordHash = await bcrypt.hash('password123', 10);

    // 4. Create Users (3 Donors, 3 Soup Kitchens, 1 Admin)
    console.log('Seeding users...');
    const users = await User.create([
      // Donors
      {
        name: 'Local Supermarket',
        email: 'donor1@portal.com',
        passwordHash,
        role: 'donor',
        location: { lat: 11.5050, lng: 77.2450 },
        reputationScore: 85
      },
      {
        name: 'City Hotel',
        email: 'donor2@portal.com',
        passwordHash,
        role: 'donor',
        location: { lat: 11.4850, lng: 77.2350 },
        reputationScore: 90
      },
      {
        name: 'Campus Cafeteria',
        email: 'donor3@portal.com',
        passwordHash,
        role: 'donor',
        location: { lat: 11.5250, lng: 77.2600 },
        reputationScore: 95
      },
      // Soup Kitchens
      {
        name: 'Community Care Kitchen',
        email: 'kitchen1@portal.com',
        passwordHash,
        role: 'soup_kitchen',
        location: { lat: 11.4950, lng: 77.2650 }
      },
      {
        name: 'Shelter Food Bank',
        email: 'kitchen2@portal.com',
        passwordHash,
        role: 'soup_kitchen',
        location: { lat: 11.5150, lng: 77.2250 }
      },
      {
        name: 'Hope Soup Kitchen',
        email: 'kitchen3@portal.com',
        passwordHash,
        role: 'soup_kitchen',
        location: { lat: 11.5100, lng: 77.2550 }
      },
      // Admin
      {
        name: 'Portal Administrator',
        email: 'admin@portal.com',
        passwordHash,
        role: 'admin',
        location: { lat: 11.5034, lng: 77.2444 }
      }
    ]);

    const donors = users.filter(u => u.role === 'donor');
    console.log(`Seeded ${users.length} users successfully.`);

    // 5. Create 6 Ingredients linked to donors
    // 2 pending, 2 approved, 2 expired
    console.log('Seeding ingredients...');
    const now = new Date();
    const futureDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days in future
    const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days in past

    const ingredients = await Ingredient.create([
      // Pending Ingredients
      {
        name: 'Fresh Tomatoes',
        category: 'Vegetables',
        quantity: 50,
        unit: 'kg',
        expiryDate: futureDate,
        pickupDeadline: futureDate,
        storageType: 'Chilled',
        status: 'pending',
        donorRef: donors[0]._id,
        location: donors[0].location,
        donorDeclaration: true
      },
      {
        name: 'Basmati Rice',
        category: 'Grains',
        quantity: 100,
        unit: 'kg',
        expiryDate: futureDate,
        pickupDeadline: futureDate,
        storageType: 'Ambient',
        status: 'pending',
        donorRef: donors[2]._id,
        location: donors[2].location,
        donorDeclaration: true
      },
      // Approved Ingredients
      {
        name: 'Whole Wheat Bread',
        category: 'Bakery',
        quantity: 20,
        unit: 'loaves',
        expiryDate: futureDate,
        pickupDeadline: futureDate,
        storageType: 'Ambient',
        status: 'approved',
        donorRef: donors[0]._id,
        location: donors[0].location,
        donorDeclaration: true
      },
      {
        name: 'Mixed Vegetable Curry',
        category: 'Vegetables',
        quantity: 15,
        unit: 'kg',
        expiryDate: futureDate,
        pickupDeadline: futureDate,
        storageType: 'Chilled',
        status: 'approved',
        donorRef: donors[1]._id,
        location: donors[1].location,
        donorDeclaration: true
      },
      // Expired Ingredients
      {
        name: 'Fresh Milk',
        category: 'Dairy',
        quantity: 30,
        unit: 'liters',
        expiryDate: pastDate,
        pickupDeadline: pastDate,
        storageType: 'Chilled',
        status: 'expired',
        donorRef: donors[1]._id,
        location: donors[1].location,
        donorDeclaration: true
      },
      {
        name: 'Cooked Chicken Breast',
        category: 'Meat',
        quantity: 10,
        unit: 'kg',
        expiryDate: pastDate,
        pickupDeadline: pastDate,
        storageType: 'Chilled',
        status: 'expired',
        donorRef: donors[2]._id,
        location: donors[2].location,
        donorDeclaration: true
      }
    ]);

    console.log(`Seeded ${ingredients.length} ingredients successfully.`);
    console.log('Seeding process completed successfully!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error during seeding:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

seedData();
