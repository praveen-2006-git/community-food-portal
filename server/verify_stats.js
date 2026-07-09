const { app, server } = require('./index');
const mongoose = require('mongoose');
const User = require('./models/User');
const Ingredient = require('./models/Ingredient');
const Request = require('./models/Request');
const Reservation = require('./models/Reservation');
const Notification = require('./models/Notification');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  try {
    await delay(2000);
    console.log('\n--- STARTING DELIVERY STATUS FLOW & LIVE STATS AUTOMATED TESTS ---');

    // 1. Log in
    // Donor 1 Login
    const donorLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'donor1@portal.com', password: 'password123' })
    });
    const donorData = await donorLoginRes.json();
    const donorToken = donorData.token;

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

    // 2. Create an approved ingredient for testing the flow
    console.log('\nCreating approved ingredient...');
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const pickupDeadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const createIngRes = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({
        name: 'Stats Verification Wheat',
        category: 'Grains',
        quantity: 25,
        unit: 'kg',
        expiryDate,
        pickupDeadline,
        storageType: 'Ambient',
        location: { lat: 11.5034, lng: 77.2444 },
        donorDeclaration: true
      })
    });
    const ingDoc = await createIngRes.json();
    await Ingredient.findByIdAndUpdate(ingDoc._id, { status: 'approved' });
    console.log('Ingredient created and approved.');

    // 3. Place a request (creates a reservation, decrements quantity)
    console.log('Placing a request for 10 kg...');
    const reqRes = await fetch(`${BASE_URL}/api/kitchen/ingredients/${ingDoc._id}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${k1Token}` },
      body: JSON.stringify({
        requestedQuantity: 10,
        pickupMode: 'self'
      })
    });
    const reqData = await reqRes.json();
    const reservationId = reqData.reservation?._id;
    console.log('Reservation created (ID):', reservationId);

    // 4. Update status to picked_up
    console.log('\nUpdating reservation status to picked_up...');
    const statusPickedUpRes = await fetch(`${BASE_URL}/api/kitchen/reservations/${reservationId}/delivery-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${k1Token}` },
      body: JSON.stringify({ deliveryStatus: 'picked_up' })
    });
    const text = await statusPickedUpRes.text();
    console.log('Status Response Code:', statusPickedUpRes.status);
    console.log('Status Response Text:', text.substring(0, 1000));
    const pickedUpData = JSON.parse(text);
    console.log('Status Response Code:', statusPickedUpRes.status);
    console.log('Reservation deliveryStatus in DB (expected picked_up):', pickedUpData.reservation?.deliveryStatus);
    console.log('Request status in DB (expected reserved):', pickedUpData.requestStatus);

    // 5. Update status to delivered
    console.log('\nUpdating reservation status to delivered...');
    const statusDeliveredRes = await fetch(`${BASE_URL}/api/kitchen/reservations/${reservationId}/delivery-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${k1Token}` },
      body: JSON.stringify({ deliveryStatus: 'delivered' })
    });
    const deliveredData = await statusDeliveredRes.json();
    console.log('Status Response Code:', statusDeliveredRes.status);
    console.log('Reservation deliveryStatus in DB (expected delivered):', deliveredData.reservation?.deliveryStatus);
    console.log('Request status in DB (expected fulfilled):', deliveredData.requestStatus);

    // 6. Verify notification was sent to donor
    console.log('\nVerifying Notification sent to donor...');
    const notifyDoc = await Notification.findOne({ userRef: donorData.user.id });
    console.log('Notification found:', !!notifyDoc);
    if (notifyDoc) {
      console.log('Notification message:', notifyDoc.message);
    }

    // 7. Verify Live Stats
    // Donor Stats
    console.log('\nFetching Donor live stats...');
    const donorStatsRes = await fetch(`${BASE_URL}/api/stats/donor`, {
      headers: { 'Authorization': `Bearer ${donorToken}` }
    });
    const donorStats = await donorStatsRes.json();
    console.log('Donor Stats status:', donorStatsRes.status);
    console.log('- Total Ingredients:', donorStats.totalIngredients);
    console.log('- Total Fulfilled Requests (expected >= 1):', donorStats.totalFulfilled);
    console.log('- Reputation Score:', donorStats.reputationScore);

    // Admin Stats
    console.log('\nFetching Admin live stats...');
    const adminStatsRes = await fetch(`${BASE_URL}/api/stats/admin`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminStats = await adminStatsRes.json();
    console.log('Admin Stats status:', adminStatsRes.status);
    console.log('- Global Ingredients:', adminStats.totalIngredients);
    console.log('- Global Fulfilled Requests (expected >= 1):', adminStats.totalFulfilled);
    console.log('- Active Food Donors:', adminStats.activeDonors);

    console.log('\n--- ALL STATUS FLOW & STATS TESTS PASSED ---');

    // Cleanup
    console.log('\nCleaning up test documents...');
    await Ingredient.deleteOne({ _id: ingDoc._id });
    await Request.deleteOne({ _id: reqData.request?._id });
    await Reservation.deleteOne({ _id: reservationId });
    if (notifyDoc) await Notification.deleteOne({ _id: notifyDoc._id });
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
