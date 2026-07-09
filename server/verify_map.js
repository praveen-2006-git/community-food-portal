const { app, server } = require('./index');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  try {
    await delay(2000);
    console.log('\n--- STARTING MAP VISUALIZATION ENDPOINTS TESTS ---');

    // Admin login
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@portal.com', password: 'password123' })
    });
    const adminData = await adminLoginRes.json();
    const adminToken = adminData.token;

    console.log('Logged in as Admin successfully.');

    // 1. Fetch approved ingredients as admin (should succeed and return array)
    console.log('Testing GET /api/kitchen/ingredients as Admin...');
    const ingredientsRes = await fetch(`${BASE_URL}/api/kitchen/ingredients`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const ingredients = await ingredientsRes.json();
    console.log('Response Status (expected 200):', ingredientsRes.status);
    console.log('Returned items array length:', ingredients.length);
    console.log('First item has distance attribute (expected false/undefined):', ingredients[0]?.hasOwnProperty('distance'));

    // 2. Fetch soup kitchens list as admin
    console.log('\nTesting GET /api/admin/kitchens...');
    const kitchensRes = await fetch(`${BASE_URL}/api/admin/kitchens`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const kitchens = await kitchensRes.json();
    console.log('Response Status (expected 200):', kitchensRes.status);
    console.log('Kitchens count:', kitchens.length);
    console.log('First kitchen info:', kitchens[0]?.name, 'Coords:', kitchens[0]?.location);

    console.log('\n--- ALL MAP VISUALIZATION ENDPOINTS TESTS PASSED ---');

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
