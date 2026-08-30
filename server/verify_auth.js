const { app, server } = require('./index');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  try {
    // Wait a brief moment for database connection to establish
    await delay(2000);
    console.log('\n--- STARTING AUTH INTEGRATION TESTS ---');

    // Test Registration of a new Donor
    console.log('\nTesting Donor Registration...');
    const registerDonorRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Donor Shop',
        email: 'test_donor@portal.com',
        password: 'StrongPassword123!',
        role: 'donor',
        location: { lat: 11.5000, lng: 77.2400 },
        contactPerson: 'Jane Doe',
        authorityToDonate: true
      })
    });
    const donorRegData = await registerDonorRes.json();
    console.log('Register Response Status:', registerDonorRes.status);
    console.log('Register Response Message:', donorRegData.message || 'Token generated successfully.');

    // Test Login with Seeded Admin (from seed.js)
    console.log('\nTesting Seeded Admin Login...');
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@portal.com',
        password: 'password123'
      })
    });
    const adminLoginData = await adminLoginRes.json();
    console.log('Login Response Status:', adminLoginRes.status);
    const adminToken = adminLoginData.token;
    console.log('Admin Login Token received:', !!adminToken);

    // Test Login with newly registered Donor
    console.log('\nTesting Donor Login...');
    const donorLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test_donor@portal.com',
        password: 'StrongPassword123!'
      })
    });
    const donorLoginData = await donorLoginRes.json();
    console.log('Login Response Status:', donorLoginRes.status);
    const donorToken = donorLoginData.token;
    console.log('Donor Login Token received:', !!donorToken);

    // Test Login with invalid credentials
    console.log('\nTesting Login with invalid credentials...');
    const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@portal.com',
        password: 'wrong_password'
      })
    });
    const badLoginData = await badLoginRes.json();
    console.log('Bad Login Response Status (expected 401):', badLoginRes.status);
    console.log('Message:', badLoginData.message);

    // Test Authorized routes
    console.log('\nTesting Endpoint authorization and routing...');

    // 1. Check anonymous access to protected route
    const anonRes = await fetch(`${BASE_URL}/api/test/any`);
    console.log('Anonymous request status (expected 401):', anonRes.status);

    // 2. Check donor access to donor route
    const donorRouteSuccessRes = await fetch(`${BASE_URL}/api/test/donor`, {
      headers: { 'Authorization': `Bearer ${donorToken}` }
    });
    const donorSuccessData = await donorRouteSuccessRes.json();
    console.log('Donor accessing Donor route status (expected 200):', donorRouteSuccessRes.status);
    console.log('Message:', donorSuccessData.message);

    // 3. Check donor access to admin route
    const donorAdminRouteRes = await fetch(`${BASE_URL}/api/test/admin`, {
      headers: { 'Authorization': `Bearer ${donorToken}` }
    });
    const donorAdminData = await donorAdminRouteRes.json();
    console.log('Donor accessing Admin route status (expected 403):', donorAdminRouteRes.status);
    console.log('Message:', donorAdminData.message);

    // 4. Check admin access to admin route
    const adminSuccessRes = await fetch(`${BASE_URL}/api/test/admin`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminSuccessData = await adminSuccessRes.json();
    console.log('Admin accessing Admin route status (expected 200):', adminSuccessRes.status);
    console.log('Message:', adminSuccessData.message);

    console.log('\n--- TESTS COMPLETED ---');

    // Clean up created user to ensure re-runnability
    console.log('Cleaning up test donor user from database...');
    const User = require('./models/User');
    await User.deleteOne({ email: 'test_donor@portal.com' });
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
