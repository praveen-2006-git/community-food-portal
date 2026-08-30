const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  let server;
  try {
    console.log('\n--- STARTING TIER 1 PAGINATION FLOW TESTS ---');

    // 1. Initialize Express server (starts server on port 5000 automatically on require)
    const { server: appServer } = require('./index');
    server = appServer;

    // Wait for Mongo connection
    while (mongoose.connection.readyState !== 1) {
      await new Promise(r => setTimeout(r, 100));
    }

    const Ingredient = require('./models/Ingredient');
    const User = require('./models/User');

    console.log('Refreshing test ingredients data...');
    const donor = await User.findOne({ email: 'donor1@portal.com' });
    if (!donor) throw new Error('Donor donor1@portal.com not found. Run seed.js first.');

    // Ensure donor is active and has validation fields to pass schema check
    donor.isActive = true;
    donor.contactPerson = 'Jane Seed';
    donor.authorityToDonate = true;
    await donor.save();

    // Delete existing ingredients to start fresh
    await Ingredient.deleteMany({});

    const now = new Date();
    const testIngs = [
      {
        name: 'Fresh Tomatoes',
        category: 'Vegetables',
        quantity: 15,
        unit: 'kg',
        expiryDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        pickupDeadline: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000),
        storageType: 'Ambient',
        status: 'available',
        donorRef: donor._id,
        location: { lat: 11.5035, lng: 77.2445 },
        donorDeclaration: true
      },
      {
        name: 'Basmati Rice',
        category: 'Grains',
        quantity: 20,
        unit: 'kg',
        expiryDate: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
        pickupDeadline: new Date(now.getTime() + 13 * 24 * 60 * 60 * 1000),
        storageType: 'Ambient',
        status: 'available',
        donorRef: donor._id,
        location: { lat: 11.5135, lng: 77.2545 },
        donorDeclaration: true
      },
      {
        name: 'Whole Wheat Bread',
        category: 'Bakery',
        quantity: 10,
        unit: 'loaves',
        expiryDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        pickupDeadline: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        storageType: 'Ambient',
        status: 'available',
        donorRef: donor._id,
        location: { lat: 11.5235, lng: 77.2645 },
        donorDeclaration: true
      },
      {
        name: 'Mixed Vegetable Curry',
        category: 'Vegetables',
        quantity: 8,
        unit: 'kg',
        expiryDate: new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000),
        pickupDeadline: new Date(now.getTime() + 17 * 24 * 60 * 60 * 1000),
        storageType: 'Ambient',
        status: 'available',
        donorRef: donor._id,
        location: { lat: 11.5335, lng: 77.2745 },
        donorDeclaration: true
      }
    ];

    for (const ing of testIngs) {
      const doc = new Ingredient(ing);
      await doc.save();
    }
    console.log('Seeded 4 fresh approved ingredients.');

    // 2. Perform Admin Login
    console.log('Logging in as Admin...');
    const loginAdminRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@portal.com',
        password: 'password123'
      })
    });
    const adminData = await loginAdminRes.json();
    const adminToken = adminData.token;

    // 3. Perform Kitchen Login
    console.log('Logging in as Kitchen...');
    const loginKitchenRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'kitchen1@portal.com',
        password: 'password123'
      })
    });
    const kitchenData = await loginKitchenRes.json();
    const kitchenToken = kitchenData.token;

    // --------------------------------------------------------
    // TEST 1: verify_admin_ledger_pagination
    // --------------------------------------------------------
    console.log('\nTesting GET /api/admin/network-ledger Pagination...');
    
    // Page 1 (limit 2)
    const ledgerPage1Res = await fetch(`${BASE_URL}/api/admin/network-ledger?page=1&limit=2`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const ledgerPage1 = await ledgerPage1Res.json();
    console.log(`Page 1 fetched. Count: ${ledgerPage1.docs.length}. Total matching: ${ledgerPage1.total}`);

    // Page 2 (limit 2)
    const ledgerPage2Res = await fetch(`${BASE_URL}/api/admin/network-ledger?page=2&limit=2`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const ledgerPage2 = await ledgerPage2Res.json();
    console.log(`Page 2 fetched. Count: ${ledgerPage2.docs.length}`);

    // Assertions
    const p1Ids = ledgerPage1.docs.map(u => u._id);
    const p2Ids = ledgerPage2.docs.map(u => u._id);
    
    // Check intersection is empty
    const duplicates = p1Ids.filter(id => p2Ids.includes(id));
    
    // Check that ledger reputation scores are non-increasing (sorted descending) across page boundaries
    let ledgerSorted = true;
    const combinedLedger = [...ledgerPage1.docs, ...ledgerPage2.docs];
    for (let i = 0; i < combinedLedger.length - 1; i++) {
      if (combinedLedger[i].reputationScore < combinedLedger[i+1].reputationScore) {
        ledgerSorted = false;
        console.error(`Ledger sorting violation: doc[${i}] score ${combinedLedger[i].reputationScore} < doc[${i+1}] score ${combinedLedger[i+1].reputationScore}`);
      }
    }

    const ledgerPassed = duplicates.length === 0 && 
                         ledgerPage1.docs.length > 0 && 
                         ledgerPage2.docs.length > 0 && 
                         ledgerSorted;
    
    console.log('Ledger P1 IDs:', p1Ids);
    console.log('Ledger P2 IDs:', p2Ids);
    console.log('Ledger Duplicate Count:', duplicates.length);
    console.log('Ledger sorted correctly across pages:', ledgerSorted);
    console.log(`TEST 1 RESULT: ${ledgerPassed ? 'PASSED ✅' : 'FAILED ❌'}`);

    // --------------------------------------------------------
    // TEST 2: verify_kitchen_ingredients_pagination_near
    // --------------------------------------------------------
    console.log('\nTesting GET /api/kitchen/ingredients Pagination & $near Proximity Sorting...');
    
    // Page 1 (limit 2)
    const ingPage1Res = await fetch(`${BASE_URL}/api/kitchen/ingredients?page=1&limit=2`, {
      headers: { 'Authorization': `Bearer ${kitchenToken}` }
    });
    const ingPage1 = await ingPage1Res.json();
    console.log(`Page 1 fetched. Count: ${ingPage1.docs.length}. Total matching: ${ingPage1.total}`);

    // Page 2 (limit 2)
    const ingPage2Res = await fetch(`${BASE_URL}/api/kitchen/ingredients?page=2&limit=2`, {
      headers: { 'Authorization': `Bearer ${kitchenToken}` }
    });
    const ingPage2 = await ingPage2Res.json();
    console.log(`Page 2 fetched. Count: ${ingPage2.docs.length}`);

    // Assertions
    const ingP1Ids = ingPage1.docs.map(i => i._id);
    const ingP2Ids = ingPage2.docs.map(i => i._id);
    
    const ingDuplicates = ingP1Ids.filter(id => ingP2Ids.includes(id));
    
    // Check that distance values are sorted ascending
    let sortedProximityPassed = true;
    const allDocs = [...ingPage1.docs, ...ingPage2.docs];
    for (let i = 0; i < allDocs.length - 1; i++) {
      if (allDocs[i].distance > allDocs[i+1].distance) {
        sortedProximityPassed = false;
        console.error(`Distance sorting violation: doc[${i}] dist ${allDocs[i].distance} > doc[${i+1}] dist ${allDocs[i+1].distance}`);
      }
    }
    
    const hasDistanceFields = allDocs.every(doc => typeof doc.distance === 'number');

    const kitchenPassed = ingDuplicates.length === 0 && 
                          ingPage1.docs.length > 0 && 
                          ingPage2.docs.length > 0 && 
                          sortedProximityPassed && 
                          hasDistanceFields;

    console.log('Kitchen P1 IDs:', ingP1Ids);
    console.log('Kitchen P2 IDs:', ingP2Ids);
    console.log('Kitchen Duplicate Count:', ingDuplicates.length);
    console.log('Distances list:', allDocs.map(doc => doc.distance));
    console.log(`TEST 2 RESULT: ${kitchenPassed ? 'PASSED ✅' : 'FAILED ❌'}`);

    const allPassed = ledgerPassed && kitchenPassed;
    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  } finally {
    if (server) {
      server.close(() => {
        console.log('Express server shut down.');
        mongoose.connection.close();
      });
    }
  }
}

runTests();
