const { app, server } = require('./index');
const mongoose = require('mongoose');
const User = require('./models/User');
const Ingredient = require('./models/Ingredient');
const Request = require('./models/Request');
const Reservation = require('./models/Reservation');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  let hasFailed = false;
  try {
    await delay(2000);
    console.log('\n--- STARTING INGREDIENT FLOW INTEGRATION TESTS ---');

    // 1. Login as Donor (using seeded donor: donor1@portal.com / password123)
    console.log('\nLogging in as Donor...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'donor1@portal.com',
        password: 'password123'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Logged in successfully. Token available:', !!token);

    // Update donor reputation to 80 so they don't bypass admin approval
    await User.findOneAndUpdate({ email: 'donor1@portal.com' }, { reputationScore: 80 });

    // 2. Upload a new ingredient
    console.log('\nUploading new ingredient...');
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const pickupDeadline = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

    const createRes = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Fresh Carrots',
        category: 'Vegetables',
        quantity: 30,
        unit: 'kg',
        expiryDate,
        pickupDeadline,
        storageType: 'Chilled',
        location: { lat: 11.5035, lng: 77.2445 },
        donorDeclaration: true
      })
    });
    const createdIngredient = await createRes.json();
    console.log('Create Response Status (expected 201):', createRes.status);
    console.log('Created Ingredient ID:', createdIngredient._id);
    console.log('Initial Status (expected pending):', createdIngredient.status);
    if (createRes.status !== 201) throw new Error(`Create Response Status expected 201, got ${createRes.status}`);
    if (createdIngredient.status !== 'pending') throw new Error(`Initial Status expected pending, got ${createdIngredient.status}`);

    // 3. View own listings
    console.log('\nFetching own listings...');
    const listRes = await fetch(`${BASE_URL}/api/ingredients/my`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const myListings = await listRes.json();
    console.log('Listings Count:', myListings.length);
    const addedListing = myListings.find(i => i._id === createdIngredient._id);
    console.log('Found newly created ingredient in list:', !!addedListing);
    if (!addedListing) throw new Error('Found newly created ingredient in list: expected true, got false');

    // 4. Edit listing
    console.log('\nEditing ingredient listing...');
    const editRes = await fetch(`${BASE_URL}/api/ingredients/${createdIngredient._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        quantity: 45,
        storageType: 'Chilled (Vented)'
      })
    });
    const updatedIngredient = await editRes.json();
    console.log('Edit Response Status (expected 200):', editRes.status);
    console.log('Updated Quantity (expected 45):', updatedIngredient.quantity);
    console.log('Updated Storage Type (expected Chilled (Vented)):', updatedIngredient.storageType);
    if (editRes.status !== 200) throw new Error(`Edit Response Status expected 200, got ${editRes.status}`);
    if (updatedIngredient.quantity !== 45) throw new Error(`Updated Quantity expected 45, got ${updatedIngredient.quantity}`);

    // 5. Test deletion block: create active reservation
    console.log('\nTesting Deletion Block Business Rule...');
    // Create mock soup kitchen user
    const kitchen = await User.findOne({ role: 'soup_kitchen' });
    if (!kitchen) throw new Error('No soup kitchen user found for testing.');

    // Create a mock Request
    const mockRequest = new Request({
      soupKitchenRef: kitchen._id,
      ingredientRef: createdIngredient._id,
      requestedQuantity: 15,
      status: 'reserved',
      pickupMode: 'self'
    });
    await mockRequest.save();

    // Create a mock Reservation with reservedQuantity > 0
    const mockReservation = new Reservation({
      requestRef: mockRequest._id,
      reservedQuantity: 15,
      expiresAt: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      deliveryStatus: 'pending',
      pickupCode: '123456'
    });
    await mockReservation.save();
    console.log('Mock Request and active Reservation created.');

    // Try deleting ingredient (should fail with 400)
    console.log('Attempting to delete ingredient with active reservation...');
    const deleteBlockedRes = await fetch(`${BASE_URL}/api/ingredients/${createdIngredient._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const deleteBlockedData = await deleteBlockedRes.json();
    console.log('Delete Response Status (expected 400):', deleteBlockedRes.status);
    console.log('Delete Response Message:', deleteBlockedData.message);
    if (deleteBlockedRes.status !== 400) throw new Error(`Delete Response Status expected 400, got ${deleteBlockedRes.status}`);

    // 6. Test successful deletion: clean reservation and requests
    console.log('\nTesting Successful Deletion...');
    await Reservation.deleteMany({ requestRef: mockRequest._id });
    await Request.deleteMany({ ingredientRef: createdIngredient._id });
    console.log('Mock Request and Reservation removed/cleared.');

    // Try deleting ingredient again (should succeed with 200)
    console.log('Attempting to delete ingredient...');
    const deleteSuccessRes = await fetch(`${BASE_URL}/api/ingredients/${createdIngredient._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Delete Response Status (expected 200):', deleteSuccessRes.status);
    if (deleteSuccessRes.status !== 200) throw new Error(`Delete Response Status expected 200, got ${deleteSuccessRes.status}`);

    // Verify it is gone from the database
    const findIngredient = await Ingredient.findById(createdIngredient._id);
    console.log('Ingredient exists in DB (expected null):', findIngredient);
    if (findIngredient !== null) throw new Error('Ingredient was not deleted from DB');

    console.log('\n--- TESTS COMPLETED SUCCESSFULLY ---');

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
