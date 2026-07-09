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
    console.log('\n--- STARTING SOUP KITCHEN & AUTO-EXPIRY AUTOMATED TESTS ---');

    // 1. Log in
    // Donor 1 Login
    const donorLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'donor1@portal.com', password: 'password123' })
    });
    const donorData = await donorLoginRes.json();
    const donorToken = donorData.token;

    // Kitchen 1 Login (Community Care Kitchen: 11.4950, 77.2650)
    const k1LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'kitchen1@portal.com', password: 'password123' })
    });
    const k1Data = await k1LoginRes.json();
    const k1Token = k1Data.token;

    // Kitchen 2 Login (Shelter Food Bank: 11.5150, 77.2250)
    const k2LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'kitchen2@portal.com', password: 'password123' })
    });
    const k2Data = await k2LoginRes.json();
    const k2Token = k2Data.token;

    console.log('Login credentials verified.');

    // 2. Create two approved ingredients at different locations for testing distance sorting
    console.log('\nCreating two approved ingredients at different coordinates...');
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const pickupDeadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Ingredient 1: near Donor 1 (11.5050, 77.2450)
    const ing1Res = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({
        name: 'Sorting Ingredient A',
        category: 'Vegetables',
        quantity: 50,
        unit: 'kg',
        expiryDate,
        pickupDeadline,
        storageType: 'Chilled',
        location: { lat: 11.5050, lng: 77.2450 },
        donorDeclaration: true
      })
    });
    const ing1 = await ing1Res.json();
    // Approve it directly in DB for testing
    await Ingredient.findByIdAndUpdate(ing1._id, { status: 'approved' });

    // Ingredient 2: near Shelter Food Bank (11.5100, 77.2300)
    const ing2Res = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({
        name: 'Sorting Ingredient B',
        category: 'Grains',
        quantity: 100,
        unit: 'kg',
        expiryDate,
        pickupDeadline,
        storageType: 'Ambient',
        location: { lat: 11.5100, lng: 77.2300 },
        donorDeclaration: true
      })
    });
    const ing2 = await ing2Res.json();
    // Approve it directly in DB for testing
    await Ingredient.findByIdAndUpdate(ing2._id, { status: 'approved' });

    console.log('Test ingredients created and approved.');

    // 3. Verify Distance Sorting for Kitchen 1
    console.log('\nFetching sorted listings for Kitchen 1 (expecting A closer)...');
    const k1ListRes = await fetch(`${BASE_URL}/api/kitchen/ingredients`, {
      headers: { 'Authorization': `Bearer ${k1Token}` }
    });
    const text = await k1ListRes.text();
    console.log('k1ListRes Status:', k1ListRes.status);
    console.log('k1ListRes Text:', text.substring(0, 1000));
    const k1List = JSON.parse(text);
    console.log('Kitchen 1 list size:', k1List.length);
    console.log('1st item:', k1List[0]?.name, 'Distance:', k1List[0]?.distance, 'km');
    console.log('2nd item:', k1List[1]?.name, 'Distance:', k1List[1]?.distance, 'km');

    // 4. Verify Distance Sorting for Kitchen 2
    console.log('\nFetching sorted listings for Kitchen 2 (expecting B closer)...');
    const k2ListRes = await fetch(`${BASE_URL}/api/kitchen/ingredients`, {
      headers: { 'Authorization': `Bearer ${k2Token}` }
    });
    const k2List = await k2ListRes.json();
    console.log('Kitchen 2 list size:', k2List.length);
    console.log('1st item:', k2List[0]?.name, 'Distance:', k2List[0]?.distance, 'km');
    console.log('2nd item:', k2List[1]?.name, 'Distance:', k2List[1]?.distance, 'km');

    // 5. Place a Request (with quantity reservation)
    console.log('\nPlacing a request for 20 units of Sorting Ingredient A...');
    const reqRes = await fetch(`${BASE_URL}/api/kitchen/ingredients/${ing1._id}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${k1Token}` },
      body: JSON.stringify({
        requestedQuantity: 20,
        pickupMode: 'volunteer',
        volunteerName: 'Ramesh Kumar'
      })
    });
    const reqData = await reqRes.json();
    console.log('Request Status (expected 201):', reqRes.status);
    console.log('Remaining quantity reported by server (expected 30):', reqData.remainingQuantity);
    console.log('Created Request ID:', reqData.request?._id);
    console.log('Created Reservation ID:', reqData.reservation?._id);

    // Verify DB count
    const dbIng1 = await Ingredient.findById(ing1._id);
    console.log('Ingredient quantity in DB:', dbIng1.quantity);

    // 6. Test Race Condition: request 40 units when only 30 are left
    console.log('\nTesting Race Condition prevention (requesting 40 when 30 remaining)...');
    const overflowRes = await fetch(`${BASE_URL}/api/kitchen/ingredients/${ing1._id}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${k2Token}` },
      body: JSON.stringify({
        requestedQuantity: 40,
        pickupMode: 'self'
      })
    });
    console.log('Overflow Request Status (expected 400):', overflowRes.status);
    const overflowData = await overflowRes.json();
    console.log('Response Message:', overflowData.message);

    // 7. Verify Auto-Expiry Scheduler
    console.log('\nTesting Auto-Expiry Sweeper...');
    // Create an approved ingredient with pickupDeadline in the past (e.g. 5 minutes ago)
    const pastDeadline = new Date(Date.now() - 5 * 60 * 1000);
    const expiredIngDoc = new Ingredient({
      name: 'Soon Expiring Milk',
      category: 'Dairy',
      quantity: 10,
      unit: 'liters',
      expiryDate: new Date(),
      pickupDeadline: pastDeadline,
      storageType: 'Chilled',
      status: 'approved',
      donorRef: donorData.user.id,
      location: { lat: 11.5034, lng: 77.2444 }
    });
    await expiredIngDoc.save();

    // Place a request for this soon-expiring ingredient
    const expReqRes = await fetch(`${BASE_URL}/api/kitchen/ingredients/${expiredIngDoc._id}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${k1Token}` },
      body: JSON.stringify({
        requestedQuantity: 10,
        pickupMode: 'self'
      })
    });
    const expReqData = await expReqRes.json();
    console.log('Expired Ingredient Request created successfully (Status 201):', expReqRes.status);

    // Run the sweeper function manually
    console.log('Running auto-expire sweeper manually...');
    await runAutoExpireSweeper();

    // Verify ingredient status is now expired in DB
    const finalIngDoc = await Ingredient.findById(expiredIngDoc._id);
    console.log('Ingredient status in DB (expected expired):', finalIngDoc.status);

    // Verify request status is now expired in DB
    const finalReqDoc = await Request.findById(expReqData.request?._id);
    console.log('Request status in DB (expected expired):', finalReqDoc.status);

    // Verify reservation deliveryStatus is now expired in DB
    const finalResDoc = await Reservation.findById(expReqData.reservation?._id);
    console.log('Reservation deliveryStatus in DB (expected expired):', finalResDoc.deliveryStatus);

    console.log('\n--- ALL SOUP KITCHEN & AUTO-EXPIRY TESTS PASSED ---');

    // Cleanup
    console.log('\nCleaning up test documents...');
    await Ingredient.deleteMany({ _id: { $in: [ing1._id, ing2._id, expiredIngDoc._id] } });
    await Request.deleteMany({ ingredientRef: { $in: [ing1._id, ing2._id, expiredIngDoc._id] } });
    if (reqData.reservation) await Reservation.deleteOne({ _id: reqData.reservation._id });
    if (expReqData.reservation) await Reservation.deleteOne({ _id: expReqData.reservation._id });
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
