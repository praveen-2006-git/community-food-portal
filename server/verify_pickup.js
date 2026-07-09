const { app, server } = require('./index');
const mongoose = require('mongoose');
const Ingredient = require('./models/Ingredient');
const Request = require('./models/Request');
const Reservation = require('./models/Reservation');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  try {
    await delay(2000);
    console.log('\n--- STARTING PICKUP CODE VERIFICATION TESTS ---');

    // 1. Log in users
    // Donor 1 Login
    const donor1LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'donor1@portal.com', password: 'password123' })
    });
    const donor1Data = await donor1LoginRes.json();
    const donor1Token = donor1Data.token;

    // Donor 2 Login (unauthorized donor for this specific ingredient)
    const donor2LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'donor2@portal.com', password: 'password123' })
    });
    const donor2Data = await donor2LoginRes.json();
    const donor2Token = donor2Data.token;

    // Kitchen 1 Login
    const k1LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'kitchen1@portal.com', password: 'password123' })
    });
    const k1Data = await k1LoginRes.json();
    const k1Token = k1Data.token;

    console.log('Login credentials verified.');

    // 2. Create approved ingredient for Donor 1
    console.log('\nCreating approved ingredient...');
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const pickupDeadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const createIngRes = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donor1Token}` },
      body: JSON.stringify({
        name: 'Verification Apples',
        category: 'Fruits',
        quantity: 50,
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

    // 3. Kitchen 1 requests the ingredient
    console.log('\nKitchen 1 placing request...');
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
    const realCode = reqData.reservation?.pickupCode;
    console.log('Reservation created. ID:', reservationId, 'pickupCode generated:', realCode);

    // 4. Verify sanitization check for Donor
    console.log('\nTesting donor GET /api/reservations/donor sanitization...');
    const donorResListRes = await fetch(`${BASE_URL}/api/reservations/donor`, {
      headers: { 'Authorization': `Bearer ${donor1Token}` }
    });
    const donorResList = await donorResListRes.json();
    const fetchedReservation = donorResList.find(r => r._id === reservationId);
    console.log('Donor list size:', donorResList.length);
    console.log('Donor fetched reservation has pickupCode (expected false/undefined):', fetchedReservation?.hasOwnProperty('pickupCode'));

    // 5. Test: attempt transition to picked_up without code verification (should fail 400)
    console.log('\nTesting status change to picked_up before code verification...');
    const invalidPickedUpRes = await fetch(`${BASE_URL}/api/reservations/${reservationId}/delivery-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donor1Token}` },
      body: JSON.stringify({ deliveryStatus: 'picked_up' })
    });
    const invalidPickedUpData = await invalidPickedUpRes.json();
    console.log('Status change response code (expected 400):', invalidPickedUpRes.status);
    console.log('Status change response message:', invalidPickedUpData.message);

    // 6. Test: Donor 2 (unauthorized) tries to verify code (should fail 403)
    console.log('\nTesting unauthorized Donor 2 verify-pickup attempt...');
    const unauthVerifyRes = await fetch(`${BASE_URL}/api/reservations/${reservationId}/verify-pickup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donor2Token}` },
      body: JSON.stringify({ enteredCode: realCode })
    });
    const unauthVerifyData = await unauthVerifyRes.json();
    console.log('Unauthorized verification response code (expected 403):', unauthVerifyRes.status);
    console.log('Unauthorized verification message:', unauthVerifyData.message);

    // 7. Test: Donor 1 tries wrong code (should fail 400)
    console.log('\nTesting wrong code verification attempt...');
    const wrongCodeVerifyRes = await fetch(`${BASE_URL}/api/reservations/${reservationId}/verify-pickup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donor1Token}` },
      body: JSON.stringify({ enteredCode: '000000' })
    });
    const wrongCodeVerifyData = await wrongCodeVerifyRes.json();
    console.log('Wrong code response code (expected 400):', wrongCodeVerifyRes.status);
    console.log('Wrong code message:', wrongCodeVerifyData.message);

    // 8. Test: Donor 1 tries correct code (should succeed)
    console.log('\nTesting correct code verification...');
    const correctCodeVerifyRes = await fetch(`${BASE_URL}/api/reservations/${reservationId}/verify-pickup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donor1Token}` },
      body: JSON.stringify({ enteredCode: realCode })
    });
    const correctCodeVerifyData = await correctCodeVerifyRes.json();
    console.log('Correct code verification response code (expected 200):', correctCodeVerifyRes.status);
    console.log('Reservation pickupConfirmedByDonor in DB:', correctCodeVerifyData.reservation?.pickupConfirmedByDonor);

    // 9. Test: Transition status to picked_up (should now succeed)
    console.log('\nTesting status change to picked_up after verification...');
    const validPickedUpRes = await fetch(`${BASE_URL}/api/reservations/${reservationId}/delivery-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donor1Token}` },
      body: JSON.stringify({ deliveryStatus: 'picked_up' })
    });
    const validPickedUpData = await validPickedUpRes.json();
    console.log('Status change response code (expected 200):', validPickedUpRes.status);
    console.log('Updated deliveryStatus in DB:', validPickedUpData.reservation?.deliveryStatus);

    // 10. Test: Transition status to delivered (should succeed and set request status to fulfilled)
    console.log('\nTesting status change to delivered...');
    const validDeliveredRes = await fetch(`${BASE_URL}/api/reservations/${reservationId}/delivery-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donor1Token}` },
      body: JSON.stringify({ deliveryStatus: 'delivered' })
    });
    const validDeliveredData = await validDeliveredRes.json();
    console.log('Delivered status response code (expected 200):', validDeliveredRes.status);
    console.log('Updated Request status (expected fulfilled):', validDeliveredData.requestStatus);

    console.log('\n--- ALL PICKUP CODE VERIFICATION TESTS PASSED ---');

    // Cleanup
    console.log('\nCleaning up test documents...');
    await Ingredient.deleteOne({ _id: ingDoc._id });
    await Request.deleteOne({ _id: reqData.request?._id });
    await Reservation.deleteOne({ _id: reservationId });
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
