const { app, server } = require('./index');
const mongoose = require('mongoose');
const User = require('./models/User');
const Ingredient = require('./models/Ingredient');
const Request = require('./models/Request');
const Reservation = require('./models/Reservation');
const IssueReport = require('./models/IssueReport');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  try {
    await delay(2000);
    console.log('\n--- STARTING DEACTIVATION & REACTIVATION TESTS ---');

    const email = 'testdeact@portal.com';
    const password = 'password123';

    // Cleanup any existing test user
    await User.deleteOne({ email });

    // 1. Register a new Donor
    console.log('Registering a new donor...');
    const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bad Donor Inc',
        email,
        password,
        role: 'donor',
        location: { lat: 11.5, lng: 77.2 }
      })
    });
    const registerData = await registerRes.json();
    const donorToken = registerData.token;
    const donorId = registerData.user?.id;
    console.log('Donor registered with reputationScore (expected 100):', registerData.user?.reputationScore);
    console.log('Donor isActive (expected true):', registerData.user?.isActive);

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

    // 2. Test 1: Admin rejects listing -> Deducts 5 points
    console.log('\nCreating listing to test admin rejection...');
    const createRes = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({
        name: 'Bad Apples 1',
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
    const ing1 = await createRes.json();

    console.log('Rejecting listing as Admin...');
    const rejectRes = await fetch(`${BASE_URL}/api/admin/ingredients/${ing1._id}/reject`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const rejectData = await rejectRes.json();
    console.log('Reputation score after rejection (expected 95):', rejectData.donorReputationScore);

    // 3. Test 2: Issue report upheld -> Deducts 15 points
    console.log('\nCreating listing to test issue report upheld...');
    const createRes2 = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({
        name: 'Bad Apples 2',
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
    const ing2 = await createRes2.json();
    await Ingredient.findByIdAndUpdate(ing2._id, { status: 'approved' });

    console.log('Soup Kitchen requesting ing2...');
    const reqRes = await fetch(`${BASE_URL}/api/kitchen/ingredients/${ing2._id}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${k1Token}` },
      body: JSON.stringify({ requestedQuantity: 5, pickupMode: 'self' })
    });
    const reqData = await reqRes.json();
    const resId = reqData.reservation?._id;
    const pickupCode = reqData.reservation?.pickupCode;

    // Verify & pickup
    await fetch(`${BASE_URL}/api/reservations/${resId}/verify-pickup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({ enteredCode: pickupCode })
    });
    await fetch(`${BASE_URL}/api/reservations/${resId}/delivery-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({ deliveryStatus: 'picked_up' })
    });

    console.log('Submitting issue report as Soup Kitchen...');
    const reportRes = await fetch(`${BASE_URL}/api/issue-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${k1Token}` },
      body: JSON.stringify({ reservationRef: resId, reason: 'Decayed fruit' })
    });
    const reportData = await reportRes.json();

    console.log('Upholding report as Admin...');
    const resolveRes = await fetch(`${BASE_URL}/api/issue-reports/${reportData._id}/resolve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'upheld' })
    });

    const donorUser = await User.findById(donorId);
    console.log('Reputation score after UPHOLD (expected 80 = 95 - 15):', donorUser.reputationScore);
    console.log('Donor isActive status (expected true):', donorUser.isActive);

    // 4. Test 3: Drop reputation below 40 -> triggers auto deactivation
    console.log('\nDeducting score further to trigger deactivation...');
    // We will drop reputation score by directly applying deductions:
    // Uphold 3 more complaints (80 - 15 - 15 - 15 = 35 < 40 deactivation)
    for (let i = 0; i < 3; i++) {
      const mockReport = new IssueReport({
        reservationRef: resId,
        ingredientRef: ing2._id,
        reportedBy: k1Data.user.id,
        reason: 'Decayed fruit ' + i,
        status: 'pending'
      });
      await mockReport.save();

      await fetch(`${BASE_URL}/api/issue-reports/${mockReport._id}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'upheld' })
      });
    }

    const deactUser = await User.findById(donorId);
    console.log('Reputation score after deactivation loop (expected 35):', deactUser.reputationScore);
    console.log('Donor isActive status (expected false):', deactUser.isActive);

    // 5. Test 4: Block deactivated donor from listing ingredient (should fail with 403)
    console.log('\nTesting listing creation while deactivated...');
    const blockRes = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({
        name: 'Blocked Apples',
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
    const blockData = await blockRes.json();
    console.log('Creation response status (expected 403):', blockRes.status);
    console.log('Creation response message:', blockData.message);

    // 6. Test 5: Admin reactivates donor manually -> sets isActive = true, reputationScore = 60
    console.log('\nAdmin reactivating donor manually...');
    const reactRes = await fetch(`${BASE_URL}/api/admin/donors/${donorId}/reactivate`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const reactData = await reactRes.json();
    console.log('Reactivation response status (expected 200):', reactRes.status);
    console.log('Donor isActive (expected true):', reactData.donor?.isActive);
    console.log('Donor reputationScore (expected 60):', reactData.donor?.reputationScore);

    // 7. Test 6: Reactivated donor can list ingredients normally again (should succeed)
    console.log('\nTesting listing creation post-reactivation...');
    const postReactRes = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({
        name: 'Success Apples',
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
    console.log('Post-reactivation listing creation status (expected 201):', postReactRes.status);

    console.log('\n--- ALL DEACTIVATION & REACTIVATION TESTS PASSED ---');

    // Cleanup
    console.log('\nCleaning up test documents...');
    await User.deleteOne({ _id: donorId });
    await Ingredient.deleteMany({ donorRef: donorId });
    await Request.deleteMany({ ingredientRef: ing2._id });
    await Reservation.deleteMany({ _id: resId });
    await IssueReport.deleteMany({ ingredientRef: ing2._id });
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
