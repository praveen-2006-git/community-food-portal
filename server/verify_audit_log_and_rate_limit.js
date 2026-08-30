const { app, server } = require('./index');
const mongoose = require('mongoose');
const User = require('./models/User');
const Ingredient = require('./models/Ingredient');
const AuditLog = require('./models/AuditLog');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  try {
    while (mongoose.connection.readyState !== 1) {
      await new Promise(r => setTimeout(r, 100));
    }
    console.log('\n--- STARTING AUDIT LOG & RATE LIMIT INTEGRATION TESTS ---');

    // Register a donor
    const donorEmail = 'audit_donor@portal.com';
    const adminEmail = 'admin@portal.com';
    const donorPassword = 'StrongPassword123!';
    const adminPassword = 'password123';

    await User.deleteOne({ email: donorEmail });
    await AuditLog.deleteMany({});

    console.log('Registering test donor...');
    const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Audit Donor',
        email: donorEmail,
        password: donorPassword,
        role: 'donor',
        location: { lat: 12.0, lng: 77.0 },
        contactPerson: 'Jane Doe',
        authorityToDonate: true
      })
    });
    const donorData = await registerRes.json();
    const donorToken = donorData.token;

    // Set donor reputation score to 80 so listings go to pending status
    await User.findByIdAndUpdate(donorData.user.id, { reputationScore: 80 });

    // Login Admin
    console.log('Logging in admin...');
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword })
    });
    const adminData = await adminLoginRes.json();
    const adminToken = adminData.token;

    // Create a pending listing
    console.log('Creating pending ingredient listing...');
    const createRes = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({
        name: 'Audit Apples',
        category: 'Fruits',
        quantity: 100,
        unit: 'kg',
        expiryDate: new Date(Date.now() + 5*24*60*60*1000),
        pickupDeadline: new Date(Date.now() + 2*24*60*60*1000),
        storageType: 'Ambient',
        location: { lat: 12.0, lng: 77.0 },
        donorDeclaration: true
      })
    });
    const ingredient = await createRes.json();
    console.log('Listing created with status (expected pending):', ingredient.status);
    if (createRes.status !== 201) throw new Error(`Create Response Status expected 201, got ${createRes.status}`);
    if (ingredient.status !== 'pending') throw new Error(`Created ingredient status expected pending, got ${ingredient.status}`);

    // Approve the listing
    console.log('Admin approving ingredient...');
    const approveRes = await fetch(`${BASE_URL}/api/admin/ingredients/${ingredient._id}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const approveData = await approveRes.json();
    console.log('Approve response status (expected 200):', approveRes.status);
    if (approveRes.status !== 200) throw new Error(`Approve status expected 200, got ${approveRes.status}`);
 
    // Verify AuditLog for approval
    const approveAudit = await AuditLog.findOne({ action: 'approve_ingredient', targetId: ingredient._id });
    console.log('Approve AuditLog generated (expected true):', !!approveAudit);
    if (!approveAudit) throw new Error('Approve AuditLog was not generated');
    if (approveAudit) {
      console.log('Approve Audit details:', approveAudit.details);
    }

    // Rate Limiting Test
    console.log('\nTesting Rate Limiting on Code Verification Endpoint...');
    let lastStatus = 0;
    let hitRateLimit = false;

    // We make 16 calls. Since max is 15, the 16th call should return 429
    for (let i = 1; i <= 16; i++) {
      const verifyRes = await fetch(`${BASE_URL}/api/reservations/6a6a18b8a38043792156ad0f/verify-pickup`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${donorToken}`
        },
        body: JSON.stringify({ enteredCode: '123456' })
      });
      lastStatus = verifyRes.status;
      if (lastStatus === 429) {
        hitRateLimit = true;
        console.log(`Call #${i}: Blocked by rate limiter (Status 429) successfully.`);
        break;
      } else {
        const body = await verifyRes.json();
        // Console log only to verify
        if (i % 5 === 0 || i === 15) {
          console.log(`Call #${i}: Response status: ${lastStatus}, message: ${body.message}`);
        }
      }
    }

    console.log('Rate limiter activated correctly (expected true):', hitRateLimit);
    if (!hitRateLimit) throw new Error('Rate limit was not hit on verification endpoint');

    // Reactivate Donor (requires deactivating first)
    const donorUser = await User.findOne({ email: donorEmail });
    donorUser.isActive = false;
    await donorUser.save();

    console.log('\nAdmin reactivating donor...');
    const reactivateRes = await fetch(`${BASE_URL}/api/admin/donors/${donorUser._id}/reactivate`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log('Reactivate response status (expected 200):', reactivateRes.status);
    if (reactivateRes.status !== 200) throw new Error(`Reactivate status expected 200, got ${reactivateRes.status}`);
 
    // Verify AuditLog for reactivation
    const reactivateAudit = await AuditLog.findOne({ action: 'reactivate_donor', targetId: donorUser._id });
    console.log('Reactivate AuditLog generated (expected true):', !!reactivateAudit);
    if (!reactivateAudit) throw new Error('Reactivate AuditLog was not generated');
    if (reactivateAudit) {
      console.log('Reactivate Audit details:', reactivateAudit.details);
    }

    // Cleanup
    await User.deleteOne({ email: donorEmail });
    await Ingredient.deleteMany({ donorRef: donorUser._id });
    await AuditLog.deleteMany({});

    console.log('\n--- ALL AUDIT LOG & RATE LIMIT TESTS PASSED ---');
    server.close();
    mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('Audit and Rate limit test failed:', error);
    server.close();
    mongoose.connection.close();
    process.exit(1);
  }
}

runTests();
