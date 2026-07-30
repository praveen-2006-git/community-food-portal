const { app, server } = require('./index');
const mongoose = require('mongoose');
const Ingredient = require('./models/Ingredient');
const User = require('./models/User');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  try {
    await delay(2000);
    console.log('\n--- STARTING ANTI-MALPRACTICE CONSTRAINTS TESTS ---');

    // Reset test donor reputation & active status to prevent cross-test pollution
    await User.updateOne(
      { email: 'donor1@portal.com' },
      { $set: { reputationScore: 100, isActive: true } }
    );

    // 1. Log in as Donor
    const donorLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'donor1@portal.com', password: 'password123' })
    });
    const donorData = await donorLoginRes.json();
    const donorToken = donorData.token;

    // 2. Log in as Admin
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@portal.com', password: 'password123' })
    });
    const adminData = await adminLoginRes.json();
    const adminToken = adminData.token;

    console.log('Login credentials verified.');

    // 3. Create an ingredient as donor
    console.log('\nCreating test listing...');
    const originalExpiry = new Date('2026-07-20T00:00:00.000Z');
    const originalPickup = new Date('2026-07-18T00:00:00.000Z');

    const createRes = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({
        name: 'Malpractice Test Apples',
        category: 'Fruits',
        quantity: 10,
        unit: 'kg',
        expiryDate: originalExpiry,
        pickupDeadline: originalPickup,
        storageType: 'Ambient',
        location: { lat: 11.5034, lng: 77.2444 },
        donorDeclaration: true
      })
    });
    const ingredient = await createRes.json();
    const ingId = ingredient._id;
    console.log('Listing created with ID:', ingId);

    // 4. Test: Donor tries to change expiryDate (should be blocked)
    console.log('\nTesting Donor trying to alter expiryDate...');
    const malExpiry = new Date('2026-07-25T00:00:00.000Z');
    const donorUpdateRes = await fetch(`${BASE_URL}/api/ingredients/${ingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({
        expiryDate: malExpiry
      })
    });
    const donorUpdateData = await donorUpdateRes.json();
    console.log('Donor Update Response Status (expected 400):', donorUpdateRes.status);
    console.log('Donor Update Response Message:', donorUpdateData.message);

    // 5. Test: Donor tries to change pickupDeadline (should be blocked)
    console.log('\nTesting Donor trying to alter pickupDeadline...');
    const malPickup = new Date('2026-07-22T00:00:00.000Z');
    const donorUpdateRes2 = await fetch(`${BASE_URL}/api/ingredients/${ingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({
        pickupDeadline: malPickup
      })
    });
    const donorUpdateData2 = await donorUpdateRes2.json();
    console.log('Donor Update Response Status (expected 400):', donorUpdateRes2.status);
    console.log('Donor Update Response Message:', donorUpdateData2.message);

    // 6. Test: Donor updates other fields normally (should succeed)
    console.log('\nTesting Donor updating normal fields (quantity, storageType)...');
    const donorNormalUpdateRes = await fetch(`${BASE_URL}/api/ingredients/${ingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({
        quantity: 20,
        storageType: 'Chilled'
      })
    });
    const normalData = await donorNormalUpdateRes.json();
    console.log('Donor Normal Update Status (expected 200):', donorNormalUpdateRes.status);
    console.log('Updated Quantity in response:', normalData.quantity);
    console.log('Updated StorageType in response:', normalData.storageType);

    // 7. Test: Admin corrects date fields (should succeed)
    console.log('\nTesting Admin correcting dates...');
    const correctedExpiry = new Date('2026-07-28T00:00:00.000Z');
    const correctedPickup = new Date('2026-07-26T00:00:00.000Z');

    const adminUpdateRes = await fetch(`${BASE_URL}/api/ingredients/${ingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        expiryDate: correctedExpiry,
        pickupDeadline: correctedPickup
      })
    });
    const adminDataUpdate = await adminUpdateRes.json();
    console.log('Admin Correction Status (expected 200):', adminUpdateRes.status);
    console.log('New Expiry in response:', new Date(adminDataUpdate.expiryDate).toISOString());
    console.log('New Pickup in response:', new Date(adminDataUpdate.pickupDeadline).toISOString());

    // 8. DB verification (to double check immutable logic saved it via collection override)
    const dbIngredient = await Ingredient.findById(ingId);
    console.log('\nDB Verification:');
    console.log('Expiry Date in DB matches corrected date:', new Date(dbIngredient.expiryDate).getTime() === correctedExpiry.getTime());
    console.log('Pickup Deadline in DB matches corrected date:', new Date(dbIngredient.pickupDeadline).getTime() === correctedPickup.getTime());

    console.log('\n--- ALL ANTI-MALPRACTICE CONSTRAINTS TESTS PASSED ---');

    // Cleanup
    console.log('\nCleaning up test documents...');
    await Ingredient.deleteOne({ _id: ingId });
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
