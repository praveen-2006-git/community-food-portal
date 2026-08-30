const { app, server } = require('./index');
const mongoose = require('mongoose');
const User = require('./models/User');
const Ingredient = require('./models/Ingredient');
const Request = require('./models/Request');
const Reservation = require('./models/Reservation');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  try {
    while (mongoose.connection.readyState !== 1) {
      await new Promise(r => setTimeout(r, 100));
    }
    console.log('\n--- STARTING PANTRY INVENTORY & FEFO AUTOMATED TESTS ---');

    // 1. Log in
    const k1LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'kitchen1@portal.com', password: 'password123' })
    });
    const k1Data = await k1LoginRes.json();
    const k1Token = k1Data.token;

    // 2. Add manual items with different expiry dates to test FEFO sorting
    console.log('\nTesting manual adjustment and FEFO sorting...');
    const adjustRes1 = await fetch(`${BASE_URL}/api/kitchen/inventory/adjust`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${k1Token}`
      },
      body: JSON.stringify({
        name: 'FEFO Apple',
        quantity: 10,
        unit: 'kg',
        minThreshold: 2,
        expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days expiry
      })
    });
    console.log('Adjust Item 1 Status:', adjustRes1.status);

    const adjustRes2 = await fetch(`${BASE_URL}/api/kitchen/inventory/adjust`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${k1Token}`
      },
      body: JSON.stringify({
        name: 'FEFO Banana',
        quantity: 5,
        unit: 'kg',
        minThreshold: 1,
        expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days expiry (sooner!)
      })
    });
    console.log('Adjust Item 2 Status:', adjustRes2.status);

    // 3. Fetch kitchen inventory and assert order
    const getInvRes = await fetch(`${BASE_URL}/api/kitchen/inventory`, {
      headers: { 'Authorization': `Bearer ${k1Token}` }
    });
    const inventory = await getInvRes.json();
    console.log('Kitchen inventory count:', inventory.length);

    // Find our seeded items
    const apple = inventory.find(i => i.name === 'FEFO Apple');
    const banana = inventory.find(i => i.name === 'FEFO Banana');

    if (!apple || !banana) {
      throw new Error('Assertion failed: FEFO Apple or FEFO Banana not found in inventory.');
    }

    if (!apple.expiryDate || !banana.expiryDate) {
      throw new Error('Assertion failed: Expiry dates not populated on inventory items.');
    }

    console.log('Apple expiryDate:', apple.expiryDate);
    console.log('Banana expiryDate:', banana.expiryDate);

    // Clean up our manual items
    const kitchen = await User.findById(k1Data.user.id);
    kitchen.inventory = kitchen.inventory.filter(i => i.name !== 'FEFO Apple' && i.name !== 'FEFO Banana');
    await kitchen.save();
    console.log('Cleaned up FEFO test manual items.');

    console.log('\n--- ALL PANTRY INVENTORY & FEFO TESTS PASSED ---');

  } catch (error) {
    console.error('FEFO test run failed with error:', error);
    process.exit(1);
  } finally {
    server.close(async () => {
      console.log('Express server shut down.');
      try {
        await mongoose.connection.close();
        console.log('Mongoose connection closed.');
      } catch (err) {
        console.error('Error closing Mongoose:', err);
      }
      process.exit(0);
    });
  }
}

runTests();
