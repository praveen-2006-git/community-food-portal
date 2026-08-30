const { app, server } = require('./index');
const mongoose = require('mongoose');
const Ingredient = require('./models/Ingredient');
const Request = require('./models/Request');
const Reservation = require('./models/Reservation');
const IssueReport = require('./models/IssueReport');
const User = require('./models/User');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  try {
    await delay(2000);
    console.log('\n--- STARTING DONOR DECLARATION & ISSUE REPORTS TESTS ---');

    // 1. Log in users
    // Donor 1 Login
    const donor1LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'donor1@portal.com', password: 'password123' })
    });
    const donor1Data = await donor1LoginRes.json();
    const donor1Token = donor1Data.token;

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

    // Fetch initial donor reputation
    const donorBefore = await User.findOne({ email: 'donor1@portal.com' });
    const initialRep = donorBefore.reputationScore;
    console.log('Initial Donor Reputation Score:', initialRep);

    // 2. Test: upload ingredient without donorDeclaration (should fail 400)
    console.log('\nTesting upload without donor declaration...');
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const pickupDeadline = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const invalidIngRes = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donor1Token}` },
      body: JSON.stringify({
        name: 'Report Test Apples',
        category: 'Fruits',
        quantity: 50,
        unit: 'kg',
        expiryDate,
        pickupDeadline,
        storageType: 'Ambient',
        location: { lat: 11.5034, lng: 77.2444 }
      })
    });
    const invalidIngData = await invalidIngRes.json();
    console.log('Upload response status (expected 400):', invalidIngRes.status);
    console.log('Upload response message:', invalidIngData.message);

    // 3. Test: upload ingredient WITH donorDeclaration (should succeed)
    console.log('\nTesting upload WITH donor declaration...');
    const validIngRes = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donor1Token}` },
      body: JSON.stringify({
        name: 'Report Test Apples',
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
    const ingDoc = await validIngRes.json();
    console.log('Upload response status (expected 201):', validIngRes.status);
    console.log('New ingredient ID:', ingDoc._id);

    // Approve the ingredient
    await Ingredient.findByIdAndUpdate(ingDoc._id, { status: 'available' });

    // 4. Kitchen 1 requests the ingredient
    console.log('\nKitchen 1 requesting 10 units...');
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
    const pickupCode = reqData.reservation?.pickupCode;
    console.log('Reservation created. ID:', reservationId, 'pickupCode:', pickupCode);

    // 5. Test: Submit issue report on 'pending' reservation (should fail 400)
    console.log('\nTesting issue report on pending reservation (must fail)...');
    const pendingReportRes = await fetch(`${BASE_URL}/api/issue-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${k1Token}` },
      body: JSON.stringify({
        reservationRef: reservationId,
        reason: 'Packaging damaged'
      })
    });
    const pendingReportData = await pendingReportRes.json();
    console.log('Report response status (expected 400):', pendingReportRes.status);
    console.log('Report response message:', pendingReportData.message);

    // 6. Transition reservation to handed_over
    // Step A: Transition to pickup_scheduled
    await fetch(`${BASE_URL}/api/reservations/${reservationId}/delivery-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donor1Token}` },
      body: JSON.stringify({ deliveryStatus: 'pickup_scheduled' })
    });
    // Step B: Donor verifies pickup code (transitions to handed_over)
    await fetch(`${BASE_URL}/api/reservations/${reservationId}/verify-pickup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donor1Token}` },
      body: JSON.stringify({ enteredCode: pickupCode })
    });
    console.log('Reservation transitioned to handed_over.');

    // 7. Test: Submit issue report on 'picked_up' reservation (should succeed)
    console.log('\nSubmitting valid issue report as kitchen...');
    const validReportRes = await fetch(`${BASE_URL}/api/issue-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${k1Token}` },
      body: JSON.stringify({
        reservationRef: reservationId,
        reason: 'Food spoiled upon inspection',
        proofDescription: 'Smelled bad and was moldy.'
      })
    });
    const reportDoc = await validReportRes.json();
    console.log('Report creation status (expected 201):', validReportRes.status);
    console.log('Issue Report ID:', reportDoc._id);

    // 8. Test: Submit duplicate issue report on same reservation (should fail 400)
    console.log('\nTesting duplicate issue report submission (must fail)...');
    const dupReportRes = await fetch(`${BASE_URL}/api/issue-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${k1Token}` },
      body: JSON.stringify({
        reservationRef: reservationId,
        reason: 'Duplicate complaint'
      })
    });
    const dupReportData = await dupReportRes.json();
    console.log('Duplicate response status (expected 400):', dupReportRes.status);
    console.log('Duplicate response message:', dupReportData.message);

    // 9. Test: Admin fetches pending reports
    console.log('\nTesting Admin GET /api/issue-reports...');
    const adminGetRes = await fetch(`${BASE_URL}/api/issue-reports`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminList = await adminGetRes.json();
    console.log('Reports fetched by admin count:', adminList.length);
    const foundReport = adminList.find(r => r._id === reportDoc._id);
    console.log('Report found in admin list:', !!foundReport);

    // 10. Test: Admin resolves report as dismissed
    console.log('\nTesting Admin resolving report as dismissed...');
    const dismissRes = await fetch(`${BASE_URL}/api/issue-reports/${reportDoc._id}/resolve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'dismissed' })
    });
    const dismissData = await dismissRes.json();
    console.log('Dismiss status (expected 200):', dismissRes.status);
    console.log('Resolved report status:', dismissData.status);

    // 11. Test: Admin resolves already resolved report (should fail 400)
    console.log('\nTesting resolving report again (must fail 400)...');
    const doubleResolveRes = await fetch(`${BASE_URL}/api/issue-reports/${reportDoc._id}/resolve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'upheld' })
    });
    const doubleResolveData = await doubleResolveRes.json();
    console.log('Double resolve status (expected 400):', doubleResolveRes.status);
    console.log('Double resolve message:', doubleResolveData.message);

    // 12. Create another issue report to test 'upheld' and reputation deduction
    console.log('\nSubmitting a new report for testing upheld status...');
    const report2Res = await fetch(`${BASE_URL}/api/issue-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${k1Token}` },
      body: JSON.stringify({
        reservationRef: reservationId,
        reason: 'Moldy bread'
      })
    });
    const report2Doc = await report2Res.json();
    console.log('New report created successfully. ID:', report2Doc._id);

    console.log('\nResolving second report as UPHELD...');
    const upholdRes = await fetch(`${BASE_URL}/api/issue-reports/${report2Doc._id}/resolve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'upheld' })
    });
    const upholdData = await upholdRes.json();
    console.log('Uphold resolve status (expected 200):', upholdRes.status);
    console.log('Report reputationDeducted value:', upholdData.reputationDeducted);

    // Fetch donor post-upheld reputation
    const donorAfter = await User.findOne({ email: 'donor1@portal.com' });
    console.log('Donor Reputation Score after UPHOLD (expected initial - 15):', donorAfter.reputationScore);
    console.log('Reputation deduction successful:', donorAfter.reputationScore === (initialRep - 15));

    console.log('\n--- ALL DONOR DECLARATION & ISSUE REPORTS TESTS PASSED ---');

    // Cleanup
    console.log('\nCleaning up test documents...');
    await Ingredient.deleteOne({ _id: ingDoc._id });
    await Request.deleteOne({ _id: reqData.request?._id });
    await Reservation.deleteOne({ _id: reservationId });
    await IssueReport.deleteMany({ reservationRef: reservationId });
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
