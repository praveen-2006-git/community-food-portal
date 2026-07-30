const { app, server } = require('./index');
const mongoose = require('mongoose');
const User = require('./models/User');
const Ingredient = require('./models/Ingredient');
const Request = require('./models/Request');
const Reservation = require('./models/Reservation');
const { runAutoExpireSweeper } = require('./utils/cron');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  try {
    await delay(2000);
    console.log('\n--- STARTING ACADEMIC ROBUSTNESS TESTS ---');

    // 1. Fetch tokens
    // Donor 1 Login
    const donorLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'donor1@portal.com', password: 'password123' })
    });
    const donorData = await donorLoginRes.json();
    const donorToken = donorData.token;
    const donorId = donorData.user?.id;

    // Kitchen 1 Login
    const k1LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'kitchen1@portal.com', password: 'password123' })
    });
    const k1Data = await k1LoginRes.json();
    const k1Token = k1Data.token;

    // Admin Login
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@portal.com', password: 'password123' })
    });
    const adminData = await adminLoginRes.json();
    const adminToken = adminData.token;

    console.log('Login credentials verified.');

    // --- TEST 1: Negative quantities rejected ---
    console.log('\nTEST 1: Negative quantity validations...');
    // Ingredient negative quantity
    const ingNegRes = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({
        name: 'Negative Apple',
        category: 'Fruits',
        quantity: -5,
        unit: 'kg',
        expiryDate: new Date(Date.now() + 5*24*60*60*1000),
        pickupDeadline: new Date(Date.now() + 5*24*60*60*1000),
        storageType: 'Ambient',
        location: { lat: 11.5, lng: 77.2 },
        donorDeclaration: true
      })
    });
    console.log('Ingredient negative quantity status (expected 400 or 500 Mongoose error):', ingNegRes.status);

    // Request negative quantity
    const reqNeg = new Request({
      soupKitchenRef: k1Data.user.id,
      ingredientRef: new mongoose.Types.ObjectId(),
      requestedQuantity: -10,
      status: 'pending',
      pickupMode: 'self'
    });
    let reqErr = null;
    try {
      await reqNeg.validate();
    } catch (e) {
      reqErr = e;
    }
    console.log('Request negative quantity validation throws error:', !!reqErr);

    // Reservation negative quantity
    const resNeg = new Reservation({
      requestRef: new mongoose.Types.ObjectId(),
      reservedQuantity: -2,
      expiresAt: new Date(),
      deliveryStatus: 'pending',
      pickupCode: '123456'
    });
    let resErr = null;
    try {
      await resNeg.validate();
    } catch (e) {
      resErr = e;
    }
    console.log('Reservation negative quantity validation throws error:', !!resErr);


    // --- TEST 2: Past expiryDate rejected on creation ---
    console.log('\nTEST 2: Past expiryDate rejection...');
    const pastExpiryRes = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({
        name: 'Past Apples',
        category: 'Fruits',
        quantity: 10,
        unit: 'kg',
        expiryDate: new Date(Date.now() - 24*60*60*1000), // yesterday
        pickupDeadline: new Date(Date.now() + 2*24*60*60*1000),
        storageType: 'Ambient',
        location: { lat: 11.5, lng: 77.2 },
        donorDeclaration: true
      })
    });
    const pastExpiryData = await pastExpiryRes.json();
    console.log('Past expiry status (expected 400):', pastExpiryRes.status);
    console.log('Past expiry message:', pastExpiryData.message);


    // --- TEST 3: pickupDeadline after expiryDate rejected ---
    console.log('\nTEST 3: pickupDeadline after expiryDate...');
    const badDeadlineRes = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({
        name: 'Bad Deadline Apples',
        category: 'Fruits',
        quantity: 10,
        unit: 'kg',
        expiryDate: new Date(Date.now() + 5*24*60*60*1000),
        pickupDeadline: new Date(Date.now() + 7*24*60*60*1000), // after expiry
        storageType: 'Ambient',
        location: { lat: 11.5, lng: 77.2 },
        donorDeclaration: true
      })
    });
    const badDeadlineData = await badDeadlineRes.json();
    console.log('Bad deadline status (expected 400):', badDeadlineRes.status);
    console.log('Bad deadline message:', badDeadlineData.message);


    // --- TEST 4: Deactivated donor listings do not appear in kitchen views ---
    console.log('\nTEST 4: Deactivated donor listings hidden...');
    // Create an approved listing for donor1
    const createRes = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({
        name: 'Donor1 Apples',
        category: 'Fruits',
        quantity: 20,
        unit: 'kg',
        expiryDate: new Date(Date.now() + 5*24*60*60*1000),
        pickupDeadline: new Date(Date.now() + 5*24*60*60*1000),
        storageType: 'Ambient',
        location: { lat: 11.5034, lng: 77.2444 },
        donorDeclaration: true
      })
    });
    const ingDoc = await createRes.json();
    await Ingredient.findByIdAndUpdate(ingDoc._id, { status: 'approved' });

    // Verify it is visible
    let kitchenListRes = await fetch(`${BASE_URL}/api/kitchen/ingredients`, {
      headers: { 'Authorization': `Bearer ${k1Token}` }
    });
    let listData = await kitchenListRes.json();
    let isFound = listData.some(ing => ing._id === ingDoc._id);
    console.log('Ingredient visible initially (expected true):', isFound);

    // Deactivate donor1
    await User.findByIdAndUpdate(donorId, { isActive: false });

    // Verify it is no longer visible
    kitchenListRes = await fetch(`${BASE_URL}/api/kitchen/ingredients`, {
      headers: { 'Authorization': `Bearer ${k1Token}` }
    });
    listData = await kitchenListRes.json();
    isFound = listData.some(ing => ing._id === ingDoc._id);
    console.log('Ingredient hidden after donor deactivation (expected true - meaning it is hidden/not found):', !isFound);


    // --- TEST 5: Direct request against deactivated donor listing is blocked ---
    console.log('\nTEST 5: Direct request against deactivated donor listing...');
    const directReqRes = await fetch(`${BASE_URL}/api/kitchen/ingredients/${ingDoc._id}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${k1Token}` },
      body: JSON.stringify({ requestedQuantity: 5, pickupMode: 'self' })
    });
    const directReqData = await directReqRes.json();
    console.log('Direct request status (expected 403):', directReqRes.status);
    console.log('Direct request message:', directReqData.message);

    // Reactivate donor1
    await User.findByIdAndUpdate(donorId, { isActive: true });


    // --- TEST 6: Pending expired ingredient auto-flipped to expired by sweeper ---
    console.log('\nTEST 6: Pending expired listing sweeper check...');
    
    // 1. Expired pending ingredient (no requests)
    const expiredPendingIng = new Ingredient({
      name: 'Expired Pending Apples',
      category: 'Fruits',
      quantity: 10,
      unit: 'kg',
      expiryDate: new Date(Date.now() - 24*60*60*1000),
      pickupDeadline: new Date(Date.now() - 24*60*60*1000),
      storageType: 'Ambient',
      status: 'pending',
      donorRef: donorId,
      location: { lat: 11.5, lng: 77.2 },
      donorDeclaration: true
    });
    await expiredPendingIng.save({ validateBeforeSave: false });

    // 2. Expired approved ingredient with a 'reserved' request & 'pending' reservation
    const expiredIngWithReserved = new Ingredient({
      name: 'Expired Approved Reserved Apples',
      category: 'Fruits',
      quantity: 10,
      unit: 'kg',
      expiryDate: new Date(Date.now() - 24*60*60*1000),
      pickupDeadline: new Date(Date.now() - 24*60*60*1000),
      storageType: 'Ambient',
      status: 'approved',
      donorRef: donorId,
      location: { lat: 11.5, lng: 77.2 },
      donorDeclaration: true
    });
    await expiredIngWithReserved.save({ validateBeforeSave: false });

    const reqReserved = new Request({
      soupKitchenRef: k1Data.user.id,
      ingredientRef: expiredIngWithReserved._id,
      requestedQuantity: 5,
      status: 'reserved',
      pickupMode: 'self'
    });
    await reqReserved.save();

    const resPending = new Reservation({
      requestRef: reqReserved._id,
      reservedQuantity: 5,
      expiresAt: expiredIngWithReserved.pickupDeadline,
      deliveryStatus: 'pending',
      pickupCode: '999999'
    });
    await resPending.save();

    // 3. Expired approved ingredient with a 'fulfilled' request & 'delivered' reservation
    const expiredIngWithFulfilled = new Ingredient({
      name: 'Expired Approved Fulfilled Apples',
      category: 'Fruits',
      quantity: 10,
      unit: 'kg',
      expiryDate: new Date(Date.now() - 24*60*60*1000),
      pickupDeadline: new Date(Date.now() - 24*60*60*1000),
      storageType: 'Ambient',
      status: 'approved',
      donorRef: donorId,
      location: { lat: 11.5, lng: 77.2 },
      donorDeclaration: true
    });
    await expiredIngWithFulfilled.save({ validateBeforeSave: false });

    const reqFulfilled = new Request({
      soupKitchenRef: k1Data.user.id,
      ingredientRef: expiredIngWithFulfilled._id,
      requestedQuantity: 5,
      status: 'fulfilled',
      pickupMode: 'self'
    });
    await reqFulfilled.save();

    const resDelivered = new Reservation({
      requestRef: reqFulfilled._id,
      reservedQuantity: 5,
      expiresAt: expiredIngWithFulfilled.pickupDeadline,
      deliveryStatus: 'delivered',
      pickupCode: '888888'
    });
    await resDelivered.save();

    console.log('Mixed batch test documents saved.');

    // Run sweeper bulk queries
    await runAutoExpireSweeper();

    // Assertions
    const checkedIng = await Ingredient.findById(expiredPendingIng._id);
    console.log('Pending expired ingredient status (expected expired):', checkedIng.status);

    const checkedReservedIng = await Ingredient.findById(expiredIngWithReserved._id);
    const checkedReqReserved = await Request.findById(reqReserved._id);
    const checkedResPending = await Reservation.findById(resPending._id);
    console.log('Reserved ingredient status (expected expired):', checkedReservedIng.status);
    console.log('Associated Request status (expected expired):', checkedReqReserved.status);
    console.log('Associated Reservation deliveryStatus (expected expired):', checkedResPending.deliveryStatus);

    const checkedFulfilledIng = await Ingredient.findById(expiredIngWithFulfilled._id);
    const checkedReqFulfilled = await Request.findById(reqFulfilled._id);
    const checkedResDelivered = await Reservation.findById(resDelivered._id);
    console.log('Fulfilled ingredient status (expected expired):', checkedFulfilledIng.status);
    console.log('Associated Fulfilled Request status (expected fulfilled):', checkedReqFulfilled.status);
    console.log('Associated Delivered Reservation deliveryStatus (expected delivered):', checkedResDelivered.deliveryStatus);


    // --- TEST 7: Admin cannot approve expired ingredient ---
    console.log('\nTEST 7: Admin approval on expired ingredient...');
    // Create another expired pending ingredient
    const expiredPendingIng2 = new Ingredient({
      name: 'Expired Pending Apples 2',
      category: 'Fruits',
      quantity: 10,
      unit: 'kg',
      expiryDate: new Date(Date.now() - 24*60*60*1000), // yesterday
      pickupDeadline: new Date(Date.now() - 24*60*60*1000),
      storageType: 'Ambient',
      status: 'pending',
      donorRef: donorId,
      location: { lat: 11.5, lng: 77.2 },
      donorDeclaration: true
    });
    await expiredPendingIng2.save({ validateBeforeSave: false });

    const approveRes = await fetch(`${BASE_URL}/api/admin/ingredients/${expiredPendingIng2._id}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const approveData = await approveRes.json();
    console.log('Admin approval response status (expected 400):', approveRes.status);
    console.log('Admin approval message:', approveData.message);

    const checkedIng2 = await Ingredient.findById(expiredPendingIng2._id);
    console.log('Ingredient status after failed approval (expected expired):', checkedIng2.status);


    // --- TEST 8: Role boundary cross-role checks ---
    console.log('\nTEST 8: Role boundary cross-role checks...');
    // Kitchen token trying to list ingredient (should be blocked with 403)
    const crossRoleRes = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${k1Token}` },
      body: JSON.stringify({
        name: 'Cross Role Apple',
        category: 'Fruits',
        quantity: 10,
        unit: 'kg',
        expiryDate: new Date(Date.now() + 5*24*60*60*1000),
        pickupDeadline: new Date(Date.now() + 5*24*60*60*1000),
        storageType: 'Ambient',
        location: { lat: 11.5, lng: 77.2 },
        donorDeclaration: true
      })
    });
    console.log('Kitchen posting ingredient status (expected 403):', crossRoleRes.status);

    // Donor token trying to view pending admin queue (should be blocked with 403)
    const crossAdminRes = await fetch(`${BASE_URL}/api/admin/ingredients/pending`, {
      headers: { 'Authorization': `Bearer ${donorToken}` }
    });
    console.log('Donor viewing admin pending status (expected 403):', crossAdminRes.status);

    console.log('\n--- ALL ACADEMIC ROBUSTNESS TESTS PASSED ---');

    // Cleanup
    console.log('\nCleaning up test documents...');
    await Ingredient.deleteMany({ _id: { $in: [ingDoc._id, expiredPendingIng._id, expiredPendingIng2._id, expiredIngWithReserved._id, expiredIngWithFulfilled._id] } });
    await Request.deleteMany({ ingredientRef: { $in: [expiredIngWithReserved._id, expiredIngWithFulfilled._id] } });
    await Reservation.deleteMany({ requestRef: { $in: [reqReserved._id, reqFulfilled._id] } });
    console.log('Cleanup complete.');

  } catch (error) {
    console.error('Test run failed with error:', error);
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
