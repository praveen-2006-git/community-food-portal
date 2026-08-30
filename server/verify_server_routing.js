const { app, server } = require('./index');
const mongoose = require('mongoose');
const User = require('./models/User');
const Ingredient = require('./models/Ingredient');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  try {
    while (mongoose.connection.readyState !== 1) {
      await new Promise(r => setTimeout(r, 100));
    }
    console.log('\n--- STARTING SERVER ROUTE OPTIMIZATION AUTOMATED TESTS ---');

    // 1. Log in
    const k1LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'kitchen1@portal.com', password: 'password123' })
    });
    const k1Data = await k1LoginRes.json();
    const k1Token = k1Data.token;

    // 2. Create two approved ingredients at different coordinates
    console.log('Seeding approved ingredients at coordinates...');
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const pickupDeadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const ing1 = new Ingredient({
      name: 'Route Stop A',
      category: 'Vegetables',
      quantity: 15,
      unit: 'kg',
      expiryDate,
      pickupDeadline,
      storageType: 'Ambient',
      location: { lat: 11.5134, lng: 77.2544 },
      donorRef: k1Data.user.id,
      status: 'available',
      donorDeclaration: true
    });
    await ing1.save();

    const ing2 = new Ingredient({
      name: 'Route Stop B',
      category: 'Grains',
      quantity: 30,
      unit: 'kg',
      expiryDate,
      pickupDeadline,
      storageType: 'Ambient',
      location: { lat: 11.4934, lng: 77.2344 },
      donorRef: k1Data.user.id,
      status: 'available',
      donorDeclaration: true
    });
    await ing2.save();

    // 3. Request Server-side optimized route calculation
    console.log('Requesting route calculation from endpoint...');
    const routeRes = await fetch(`${BASE_URL}/api/kitchen/route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${k1Token}`
      },
      body: JSON.stringify({
        source: 'basket',
        basketItems: [
          { ingredientId: ing1._id.toString(), name: ing1.name, quantity: 5, unit: 'kg', location: ing1.location },
          { ingredientId: ing2._id.toString(), name: ing2.name, quantity: 10, unit: 'kg', location: ing2.location }
        ]
      })
    });

    console.log('Route response status:', routeRes.status);
    const routeData = await routeRes.json();

    if (routeRes.status !== 200) {
      throw new Error(`Assertion failed: Route status should be 200, got ${routeRes.status}`);
    }

    console.log('Sequence stops calculated:', routeData.sequence?.length);
    console.log('Total route distance:', routeData.totalDistance);
    console.log('OSRM road geometry count:', routeData.roadGeometry?.length);
    console.log('Routing type:', routeData.routingType);

    if (!Array.isArray(routeData.sequence) || routeData.sequence.length !== 2) {
      throw new Error('Assertion failed: sequence should contain exactly 2 stops.');
    }

    if (!Array.isArray(routeData.roadGeometry) || routeData.roadGeometry.length === 0) {
      throw new Error('Assertion failed: roadGeometry should be a non-empty array of coordinates.');
    }

    // Clean up test listings
    await Ingredient.deleteOne({ _id: ing1._id });
    await Ingredient.deleteOne({ _id: ing2._id });
    console.log('Cleaned up test ingredients.');

    console.log('\n--- ALL SERVER ROUTE OPTIMIZATION TESTS PASSED ---');

  } catch (error) {
    console.error('Route optimization test failed with error:', error);
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
