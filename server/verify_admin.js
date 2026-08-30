const { app, server } = require('./index');
const mongoose = require('mongoose');
const User = require('./models/User');
const Ingredient = require('./models/Ingredient');
const QualityReport = require('./models/QualityReport');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  let hasFailed = false;
  let originalScore = 85;
  try {
    await delay(2000);
    console.log('\n--- STARTING ADMIN FLOW & CATEGORY VALIDATION TESTS ---');

    // 1. Get Tokens
    // Donor login
    const donorLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'donor1@portal.com', password: 'password123' })
    });
    const donorData = await donorLoginRes.json();
    console.log('Donor Login Status:', donorLoginRes.status, 'Response:', donorData);
    const donorToken = donorData.token;
    
    // Admin login
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@portal.com', password: 'password123' })
    });
    const adminData = await adminLoginRes.json();
    const adminToken = adminData.token;

    console.log('Tokens retrieved successfully.');

    // Save original score and set donor reputation score to 80 so listings go to pending status
    const originalDonor = await User.findById(donorData.user.id);
    if (originalDonor) {
      originalScore = originalDonor.reputationScore;
      originalDonor.reputationScore = 80;
      await originalDonor.save();
    }

    // 2. Enforce Category Validation: Create ingredient with INVALID category
    console.log('\nTesting Category Validation: Uploading invalid category...');
    const invalidCreateRes = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${donorToken}`
      },
      body: JSON.stringify({
        name: 'Prepared Chicken Biryani',
        category: 'Meals', // Meals was removed! Should fail validation.
        quantity: 10,
        unit: 'plates',
        expiryDate: new Date(),
        pickupDeadline: new Date(),
        storageType: 'Chilled',
        location: { lat: 11.5034, lng: 77.2444 },
        donorDeclaration: true
      })
    });
    console.log('Invalid category Create Response Status (expected 400):', invalidCreateRes.status);
    const invalidCreateData = await invalidCreateRes.json();
    console.log('Error message:', invalidCreateData.message);
    if (invalidCreateRes.status !== 400) throw new Error(`Invalid category Create Response Status expected 400, got ${invalidCreateRes.status}`);

    // 3. Create a VALID ingredient for testing approval
    console.log('\nCreating valid pending ingredient (Canned Goods)...');
    const validCreateRes = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${donorToken}`
      },
      body: JSON.stringify({
        name: 'Organic Baked Beans',
        category: 'Canned Goods', // Approved category
        quantity: 12,
        unit: 'cans',
        expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        pickupDeadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        storageType: 'Ambient',
        location: { lat: 11.5034, lng: 77.2444 },
        donorDeclaration: true
      })
    });
    const testIng1 = await validCreateRes.json();
    console.log('Valid ingredient 1 created (ID):', testIng1._id);
    if (validCreateRes.status !== 201) throw new Error(`Valid ingredient 1 Create expected 201, got ${validCreateRes.status}`);
    if (testIng1.status !== 'pending') throw new Error(`Valid ingredient 1 status expected pending, got ${testIng1.status}`);

    // Create a second VALID ingredient for testing rejection
    console.log('\nCreating second valid pending ingredient (Spices)...');
    const validCreateRes2 = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${donorToken}`
      },
      body: JSON.stringify({
        name: 'Red Chili Powder',
        category: 'Spices', // Approved category
        quantity: 2,
        unit: 'kg',
        expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        pickupDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        storageType: 'Ambient',
        location: { lat: 11.5034, lng: 77.2444 },
        donorDeclaration: true
      })
    });
    const testIng2 = await validCreateRes2.json();
    console.log('Valid ingredient 2 created (ID):', testIng2._id);
    if (validCreateRes2.status !== 201) throw new Error(`Valid ingredient 2 Create expected 201, got ${validCreateRes2.status}`);
    if (testIng2.status !== 'pending') throw new Error(`Valid ingredient 2 status expected pending, got ${testIng2.status}`);

    // 4. Fetch pending list as admin
    console.log('\nFetching pending list as Admin...');
    const pendingRes = await fetch(`${BASE_URL}/api/admin/ingredients/pending`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const pendingList = await pendingRes.json();
    console.log('Pending listings fetched. Status (expected 200):', pendingRes.status);
    console.log('Number of pending items:', pendingList.length);
    const hasIng1 = pendingList.some(item => item._id === testIng1._id);
    const hasIng2 = pendingList.some(item => item._id === testIng2._id);
    console.log('Has Ingredient 1 in pending list:', hasIng1);
    console.log('Has Ingredient 2 in pending list:', hasIng2);
    if (pendingRes.status !== 200) throw new Error(`Pending fetch expected 200, got ${pendingRes.status}`);
    if (!hasIng1 || !hasIng2) throw new Error('Pending list should contain both created ingredients');

    // 5. Approve Ingredient 1 with Quality Checklist
    console.log('\nApproving Ingredient 1...');
    const approveRes = await fetch(`${BASE_URL}/api/admin/ingredients/${testIng1._id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        packagingIntact: true,
        expiryValid: true,
        noFoulSmell: true,
        properStorage: true,
        noLeakage: true,
        quantityVerified: true
      })
    });
    const approveData = await approveRes.json();
    console.log('Approve response status (expected 200):', approveRes.status);
    console.log('Approve response message:', approveData.message);
    if (approveRes.status !== 200) throw new Error(`Approve status expected 200, got ${approveRes.status}`);
    
    // Check ingredient status from DB
    const approvedIng = await Ingredient.findById(testIng1._id);
    console.log('Updated Status in DB (expected available):', approvedIng.status);
    if (approvedIng.status !== 'available') throw new Error(`DB Status expected available, got ${approvedIng.status}`);
 
    // Verify Quality Report was created
    const qr = await QualityReport.findOne({ ingredientRef: testIng1._id });
    console.log('QualityReport created in DB:', !!qr);
    if (!qr) throw new Error('QualityReport was not created in DB');
    if (qr) {
      console.log('- Verified by (ID):', qr.verifiedBy.toString());
      console.log('- Packaging Intact:', qr.packagingIntact);
    }

    // 6. Reject Ingredient 2 and verify Reputation Score deduction
    console.log('\nChecking donor reputation score before rejection...');
    const donorBefore = await User.findById(testIng2.donorRef);
    const scoreBefore = donorBefore.reputationScore || 0;
    console.log('Donor score before rejection:', scoreBefore);

    console.log('Rejecting Ingredient 2...');
    const rejectRes = await fetch(`${BASE_URL}/api/admin/ingredients/${testIng2._id}/reject`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const rejectData = await rejectRes.json();
    console.log('Reject response status (expected 200):', rejectRes.status);
    console.log('Reject response message:', rejectData.message);
    if (rejectRes.status !== 200) throw new Error(`Reject status expected 200, got ${rejectRes.status}`);
 
    // Check ingredient status in DB
    const rejectedIng = await Ingredient.findById(testIng2._id);
    console.log('Updated Status in DB (expected rejected):', rejectedIng.status);
    if (rejectedIng.status !== 'rejected') throw new Error(`DB Status expected rejected, got ${rejectedIng.status}`);
 
    // Check reputation score after rejection
    const donorAfter = await User.findById(testIng2.donorRef);
    const scoreAfter = donorAfter.reputationScore || 0;
    console.log('Donor score after rejection:', scoreAfter);
    console.log('Score difference (expected 5):', scoreBefore - scoreAfter);
    if (scoreBefore - scoreAfter !== 5) throw new Error(`Reputation deduction mismatch: expected 5, got ${scoreBefore - scoreAfter}`);

    console.log('\n--- TESTS COMPLETED SUCCESSFULLY ---');

    // Cleanup created entries
    console.log('Cleaning up test documents...');
    await Ingredient.deleteOne({ _id: testIng1._id });
    await Ingredient.deleteOne({ _id: testIng2._id });
    await QualityReport.deleteOne({ ingredientRef: testIng1._id });
    // Restore donor score
    const donorToRestore = await User.findById(donorData.user.id);
    if (donorToRestore) {
      donorToRestore.reputationScore = originalScore;
      await donorToRestore.save();
    }
    console.log('Cleanup complete.');
 
  } catch (error) {
    console.error('Test run failed with error:', error);
    hasFailed = true;
  } finally {
    server.close(async () => {
      console.log('Express server shut down.');
      try {
        await mongoose.connection.close();
        console.log('Mongoose connection closed.');
      } catch (err) {
        console.error('Error closing Mongoose:', err);
      }
      process.exit(hasFailed ? 1 : 0);
    });
  }
}

runTests();
