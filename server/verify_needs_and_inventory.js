const mongoose = require('mongoose');
const assert = require('assert');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Ingredient = require('./models/Ingredient');
const Reservation = require('./models/Reservation');
const WeeklyNeed = require('./models/WeeklyNeed');
const Request = require('./models/Request');
const { app, server } = require('./index');

async function runTests() {
  console.log('\n--- STARTING SOUP KITCHEN NEEDS & INVENTORY TESTS ---');

  let testKitchen, testDonor, testIngredient, testReservation, testNeed;

  try {
    // Wait for Mongo connection
    while (mongoose.connection.readyState !== 1) {
      await new Promise(r => setTimeout(r, 100));
    }

    // 1. Setup clean state
    await User.deleteMany({ email: /needs/ });
    await WeeklyNeed.deleteMany({});

    const passwordHash = await bcrypt.hash('password123', 10);
    
    // Create donor and kitchen
    testDonor = await User.create({
      name: 'Test Donor Needs',
      email: 'test-donor-needs@portal.com',
      passwordHash,
      role: 'donor',
      location: { lat: 11.5, lng: 77.2 },
      locationGeo: { type: 'Point', coordinates: [77.2, 11.5] },
      contactPerson: 'John Needs',
      authorityToDonate: true
    });

    testKitchen = await User.create({
      name: 'Test Kitchen Needs',
      email: 'test-kitchen-needs@portal.com',
      passwordHash,
      role: 'soup_kitchen',
      location: { lat: 11.51, lng: 77.21 },
      locationGeo: { type: 'Point', coordinates: [77.21, 11.51] },
      inventory: []
    });

    const tokenRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test-kitchen-needs@portal.com', password: 'password123' })
    });
    const { token } = await tokenRes.json();

    const donorTokenRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test-donor-needs@portal.com', password: 'password123' })
    });
    const { token: donorToken } = await donorTokenRes.json();

    // 2. Test weekly needs declaration
    console.log('TEST 1: Declare weekly needs...');
    const needRes = await fetch('http://localhost:5000/api/kitchen/needs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ingredientName: 'Rice',
        quantity: 50,
        unit: 'kg',
        priority: 'urgent'
      })
    });
    assert.strictEqual(needRes.status, 201, 'Need declaration should return 201');
    const needData = await needRes.json();
    testNeed = needData.need;
    assert.strictEqual(testNeed.ingredientName, 'Rice');
    console.log('TEST 1 PASSED ✅');

    // 3. Test active needs query for donors
    console.log('TEST 2: Fetch active needs for donors...');
    const activeNeedsRes = await fetch('http://localhost:5000/api/ingredients/active-needs', {
      headers: { 'Authorization': `Bearer ${donorToken}` }
    });
    assert.strictEqual(activeNeedsRes.status, 200, 'Fetching active needs should return 200');
    const activeNeedsData = await activeNeedsRes.json();
    assert.ok(activeNeedsData.length > 0, 'Active needs list should not be empty');
    assert.strictEqual(activeNeedsData[0].ingredientName, 'Rice');
    console.log('TEST 2 PASSED ✅');

    // 4. Test delivery status handoff tracking & inventory increment
    console.log('TEST 3: Handoff tracking & inventory auto-increment on delivered status...');
    
    // Seed an ingredient listing
    testIngredient = await Ingredient.create({
      name: 'Rice',
      category: 'Grains',
      quantity: 30,
      unit: 'kg',
      storageType: 'ambient',
      expiryDate: new Date(Date.now() + 86400000),
      pickupDeadline: new Date(Date.now() + 86400000),
      donorRef: testDonor._id,
      status: 'available',
      location: { lat: 11.5, lng: 77.2 },
      locationGeo: { type: 'Point', coordinates: [77.2, 11.5] },
      donorDeclaration: true
    });

    // Create a mock request
    const mockRequest = await Request.create({
      soupKitchenRef: testKitchen._id,
      ingredientRef: testIngredient._id,
      requestedQuantity: 20,
      status: 'claimed',
      pickupMode: 'self'
    });

    // Create reservation
    testReservation = await Reservation.create({
      requestRef: mockRequest._id,
      reservedQuantity: 20,
      expiresAt: new Date(Date.now() + 86400000),
      deliveryStatus: 'claimed',
      pickupCode: '123456'
    });

    // Step A: Schedule pickup
    await fetch(`http://localhost:5000/api/kitchen/reservations/${testReservation._id}/delivery-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ deliveryStatus: 'pickup_scheduled' })
    });

    // Step B: Verify pickup code (transitions to handed_over)
    await fetch(`http://localhost:5000/api/reservations/${testReservation._id}/verify-pickup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({ enteredCode: '123456' })
    });

    // Step C: Complete delivery
    const deliveryRes = await fetch(`http://localhost:5000/api/kitchen/reservations/${testReservation._id}/delivery-status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        deliveryStatus: 'completed',
        receivedQuantity: 18,
        condition: 'partial'
      })
    });
    assert.strictEqual(deliveryRes.status, 200, 'Delivery status update should return 200');
    
    // Verify inventory incremented in DB
    const updatedKitchen = await User.findById(testKitchen._id);
    const riceStock = updatedKitchen.inventory.find(i => i.name === 'Rice');
    assert.ok(riceStock, 'Rice should be added to canteens inventory');
    assert.strictEqual(riceStock.quantity, 18, 'Canteen Rice quantity should be 18 (matching actual received quantity)');
    assert.strictEqual(riceStock.unit, 'kg');
    console.log('TEST 3 PASSED ✅');

    // 5. Test manual stock adjustments
    console.log('TEST 4: Manual stock adjustment...');
    const adjustRes = await fetch('http://localhost:5000/api/kitchen/inventory/adjust', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Rice',
        quantity: 25,
        unit: 'kg',
        minThreshold: 10
      })
    });
    assert.strictEqual(adjustRes.status, 200, 'Manual adjust should return 200');
    const adjustedKitchen = await User.findById(testKitchen._id);
    const adjustedRice = adjustedKitchen.inventory.find(i => i.name === 'Rice');
    assert.strictEqual(adjustedRice.quantity, 25, 'Adjusted quantity should be 25');
    assert.strictEqual(adjustedRice.minThreshold, 10, 'Min threshold should be 10');
    console.log('TEST 4 PASSED ✅');

    // 6. Test consumption logging
    console.log('TEST 5: Record consumption...');
    const consumeRes = await fetch('http://localhost:5000/api/kitchen/inventory/consume', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Rice',
        quantity: 8
      })
    });
    assert.strictEqual(consumeRes.status, 200, 'Consumption log should return 200');
    const consumedKitchen = await User.findById(testKitchen._id);
    const consumedRice = consumedKitchen.inventory.find(i => i.name === 'Rice');
    assert.strictEqual(consumedRice.quantity, 17, 'Consumed quantity should deduct from 25 to 17');
    console.log('TEST 5 PASSED ✅');

    // Clean up
    await User.deleteMany({ email: /needs/ });
    await WeeklyNeed.deleteMany({});
    await Ingredient.deleteMany({ _id: testIngredient._id });
    await Reservation.deleteMany({ _id: testReservation._id });
    await Request.deleteMany({ ingredientRef: testIngredient._id });

    console.log('\n--- ALL SOUP KITCHEN NEEDS & INVENTORY TESTS PASSED ---');
    server.close();
    process.exit(0);

  } catch (err) {
    console.error('Test run failed with error:', err);
    if (server) server.close();
    process.exit(1);
  }
}

runTests();
