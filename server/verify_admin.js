const { app, server } = require('./index');
const mongoose = require('mongoose');
const User = require('./models/User');
const Ingredient = require('./models/Ingredient');
const QualityReport = require('./models/QualityReport');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
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
        pickupDeadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        storageType: 'Ambient',
        location: { lat: 11.5034, lng: 77.2444 },
        donorDeclaration: true
      })
    });
    const testIng1 = await validCreateRes.json();
    console.log('Valid ingredient 1 created (ID):', testIng1._id);

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
        pickupDeadline: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
        storageType: 'Ambient',
        location: { lat: 11.5034, lng: 77.2444 },
        donorDeclaration: true
      })
    });
    const testIng2 = await validCreateRes2.json();
    console.log('Valid ingredient 2 created (ID):', testIng2._id);

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
    
    // Check ingredient status from DB
    const approvedIng = await Ingredient.findById(testIng1._id);
    console.log('Updated Status in DB (expected approved):', approvedIng.status);

    // Verify Quality Report was created
    const qr = await QualityReport.findOne({ ingredientRef: testIng1._id });
    console.log('QualityReport created in DB:', !!qr);
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

    // Check ingredient status in DB
    const rejectedIng = await Ingredient.findById(testIng2._id);
    console.log('Updated Status in DB (expected rejected):', rejectedIng.status);

    // Check reputation score after rejection
    const donorAfter = await User.findById(testIng2.donorRef);
    const scoreAfter = donorAfter.reputationScore || 0;
    console.log('Donor score after rejection:', scoreAfter);
    console.log('Score difference (expected 5):', scoreBefore - scoreAfter);

    console.log('\n--- TESTS COMPLETED SUCCESSFULLY ---');

    // Cleanup created entries
    console.log('Cleaning up test documents...');
    await Ingredient.deleteOne({ _id: testIng1._id });
    await Ingredient.deleteOne({ _id: testIng2._id });
    await QualityReport.deleteOne({ ingredientRef: testIng1._id });
    // Restore donor score
    donorAfter.reputationScore = scoreBefore;
    await donorAfter.save();
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
