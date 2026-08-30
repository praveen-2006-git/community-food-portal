const { app, server } = require('./index');
const mongoose = require('mongoose');
const User = require('./models/User');
const Ingredient = require('./models/Ingredient');
const Request = require('./models/Request');
const Reservation = require('./models/Reservation');
const Notification = require('./models/Notification');
const AuditLog = require('./models/AuditLog');
const { runAutoExpireSweeper } = require('./utils/cron');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  try {
    while (mongoose.connection.readyState !== 1) {
      await new Promise(r => setTimeout(r, 100));
    }
    console.log('\n--- STARTING TECHNICAL CORRECTIONS SUITE (verify_corrections.js) ---');

    // Clean up past test data
    const donorEmail = 'corrections_donor@portal.com';
    const kitchenEmail = 'corrections_kitchen@portal.com';
    await User.deleteMany({ email: { $in: [donorEmail, kitchenEmail] } });
    await AuditLog.deleteMany({});
    await Notification.deleteMany({});

    // Register Donor
    console.log('Registering test donor...');
    const regDonorRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Corrections Donor',
        email: donorEmail,
        password: 'Password123!',
        role: 'donor',
        location: { lat: 11.5, lng: 77.2 },
        contactPerson: 'Alice',
        authorityToDonate: true
      })
    });
    const donorData = await regDonorRes.json();
    const donorToken = donorData.token;

    // Set donor reputation score to 100 so listings go directly to available status
    await User.findByIdAndUpdate(donorData.user.id, { reputationScore: 100 });

    // Register Soup Kitchen
    console.log('Registering test kitchen...');
    const regKitchenRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Corrections Kitchen',
        email: kitchenEmail,
        password: 'Password123!',
        role: 'soup_kitchen',
        location: { lat: 11.51, lng: 77.21 },
        storageCapabilities: ['ambient']
      })
    });
    const kitchenData = await regKitchenRes.json();
    const kitchenToken = kitchenData.token;

    // -------------------------------------------------------------------------
    // TEST 1: Secure Handover codes hashing and verification
    // -------------------------------------------------------------------------
    console.log('\n=== TEST 1: Secure Handover Hashing, Verification & Single-use ===');
    const createRes = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({
        name: 'Corrections Apples',
        category: 'vegetable', // vegetables maps to vegetable
        quantity: 10,
        unit: 'kg',
        expiryDate: new Date(Date.now() + 5*24*60*60*1000),
        pickupDeadline: new Date(Date.now() + 2*24*60*60*1000),
        storageType: 'Ambient',
        location: { lat: 11.5, lng: 77.2 },
        donorDeclaration: true
      })
    });
    const ingDoc = await createRes.json();
    console.log('Ingredient created, status:', ingDoc.status);

    // Claim listing
    const claimRes = await fetch(`${BASE_URL}/api/kitchen/ingredients/${ingDoc._id}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kitchenToken}` },
      body: JSON.stringify({ requestedQuantity: 10, pickupMode: 'self' })
    });
    const claimData = await claimRes.json();
    const plainCode = claimData.reservation?.pickupCode;
    const reservationId = claimData.reservation?._id;

    console.log(`Plaintext pickup code returned in response: ${plainCode}`);
    if (!plainCode || plainCode.length !== 6) throw new Error('Expected 6-digit plain pickup code');

    // Query DB directly to check if hashed
    const dbRes = await Reservation.findById(reservationId);
    console.log(`Hashed code stored in DB: ${dbRes.pickupCode}`);
    if (dbRes.pickupCode === plainCode) throw new Error('Plaintext code was stored in DB, expected hash!');
    if (!/^[0-9a-fA-F]{64}$/.test(dbRes.pickupCode)) throw new Error('Hashed code is not a valid 64-char hex string');

    // Verify code with wrong code first
    console.log('Verifying with wrong code...');
    const verifyFailRes = await fetch(`${BASE_URL}/api/reservations/${reservationId}/verify-pickup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({ enteredCode: '000000' })
    });
    console.log('Wrong code verify status (expected 400):', verifyFailRes.status);
    if (verifyFailRes.status !== 400) throw new Error('Verify should fail with 400 for wrong code');

    // Verify code with correct code
    console.log('Verifying with correct code...');
    const verifySuccessRes = await fetch(`${BASE_URL}/api/reservations/${reservationId}/verify-pickup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({ enteredCode: plainCode })
    });
    console.log('Correct code verify status (expected 200):', verifySuccessRes.status);
    if (verifySuccessRes.status !== 200) throw new Error('Verify should succeed with 200');

    // Verify code again to test single-use
    console.log('Verifying code again (single-use test)...');
    const verifyAgainRes = await fetch(`${BASE_URL}/api/reservations/${reservationId}/verify-pickup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({ enteredCode: plainCode })
    });
    console.log('Second verify status (expected 400):', verifyAgainRes.status);
    if (verifyAgainRes.status !== 400) throw new Error('Verify should fail on reuse');

    // -------------------------------------------------------------------------
    // TEST 2: Maximum failed attempts lock
    // -------------------------------------------------------------------------
    console.log('\n=== TEST 2: Maximum Failed Attempts Lock ===');
    const createRes2 = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({
        name: 'Corrections Pears',
        category: 'vegetable',
        quantity: 5,
        unit: 'kg',
        expiryDate: new Date(Date.now() + 5*24*60*60*1000),
        pickupDeadline: new Date(Date.now() + 2*24*60*60*1000),
        storageType: 'Ambient',
        location: { lat: 11.5, lng: 77.2 },
        donorDeclaration: true
      })
    });
    const ingDoc2 = await createRes2.json();

    const claimRes2 = await fetch(`${BASE_URL}/api/kitchen/ingredients/${ingDoc2._id}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kitchenToken}` },
      body: JSON.stringify({ requestedQuantity: 5, pickupMode: 'self' })
    });
    const claimData2 = await claimRes2.json();
    const plainCode2 = claimData2.reservation?.pickupCode;
    const reservationId2 = claimData2.reservation?._id;

    // Fail 3 times
    for (let i = 1; i <= 3; i++) {
      await fetch(`${BASE_URL}/api/reservations/${reservationId2}/verify-pickup`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
        body: JSON.stringify({ enteredCode: '999999' })
      });
    }

    // Attempt 4 with correct code should fail because locked
    console.log('Attempting correct code after 3 failures (should be locked)...');
    const verifyLockedRes = await fetch(`${BASE_URL}/api/reservations/${reservationId2}/verify-pickup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({ enteredCode: plainCode2 })
    });
    const lockedData = await verifyLockedRes.json();
    console.log('Verify locked status (expected 400):', verifyLockedRes.status);
    console.log('Verify locked message:', lockedData.message);
    if (verifyLockedRes.status !== 400 || !lockedData.message.includes('locked')) {
      throw new Error('Expected 400 failure with locked code message');
    }

    // -------------------------------------------------------------------------
    // TEST 3: Expiry and Regeneration
    // -------------------------------------------------------------------------
    console.log('\n=== TEST 3: Code Expiry and Regeneration ===');
    const createRes3 = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({
        name: 'Corrections Bananas',
        category: 'vegetable',
        quantity: 8,
        unit: 'kg',
        expiryDate: new Date(Date.now() + 5*24*60*60*1000),
        pickupDeadline: new Date(Date.now() + 2*24*60*60*1000),
        storageType: 'Ambient',
        location: { lat: 11.5, lng: 77.2 },
        donorDeclaration: true
      })
    });
    const ingDoc3 = await createRes3.json();

    const claimRes3 = await fetch(`${BASE_URL}/api/kitchen/ingredients/${ingDoc3._id}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kitchenToken}` },
      body: JSON.stringify({ requestedQuantity: 8, pickupMode: 'self' })
    });
    const claimData3 = await claimRes3.json();
    const plainCode3 = claimData3.reservation?.pickupCode;
    const reservationId3 = claimData3.reservation?._id;

    // Set codeExpiresAt in DB to past date
    await Reservation.findByIdAndUpdate(reservationId3, { codeExpiresAt: new Date(Date.now() - 10000) });

    // Verify should fail
    console.log('Verifying expired code (expected fail)...');
    const verifyExpiredRes = await fetch(`${BASE_URL}/api/reservations/${reservationId3}/verify-pickup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({ enteredCode: plainCode3 })
    });
    const expiredData = await verifyExpiredRes.json();
    console.log('Expired code status (expected 400):', verifyExpiredRes.status);
    console.log('Expired message:', expiredData.message);
    if (verifyExpiredRes.status !== 400 || !expiredData.message.includes('expired')) {
      throw new Error('Expected 400 failure with expired code message');
    }

    // Regenerate code
    console.log('Regenerating code...');
    const regenRes = await fetch(`${BASE_URL}/api/reservations/${reservationId3}/regenerate-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kitchenToken}` }
    });
    const regenData = await regenRes.json();
    const newCode = regenData.pickupCode;
    console.log('New regenerated code:', newCode);
    if (!newCode || newCode === plainCode3) throw new Error('Expected new regenerated code');

    // Verify regenerated code (should succeed)
    console.log('Verifying regenerated code...');
    const verifyRegenRes = await fetch(`${BASE_URL}/api/reservations/${reservationId3}/verify-pickup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({ enteredCode: newCode })
    });
    console.log('Regenerated code verify status (expected 200):', verifyRegenRes.status);
    if (verifyRegenRes.status !== 200) throw new Error('Verify regenerated code should succeed with 200');

    // -------------------------------------------------------------------------
    // TEST 4: Expiry Sweeper behavior on active reservations (warning only)
    // -------------------------------------------------------------------------
    console.log('\n=== TEST 4: Expiry Sweeper on Reserved Listing ===');
    const createRes4 = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
      body: JSON.stringify({
        name: 'Sweeper Apples',
        category: 'vegetable',
        quantity: 2,
        unit: 'kg',
        expiryDate: new Date(Date.now() + 5*24*60*60*1000),
        pickupDeadline: new Date(Date.now() - 10000), // past deadline
        storageType: 'Ambient',
        location: { lat: 11.5, lng: 77.2 },
        donorDeclaration: true
      })
    });
    const ingDoc4 = await createRes4.json();

    const claimRes4 = await fetch(`${BASE_URL}/api/kitchen/ingredients/${ingDoc4._id}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kitchenToken}` },
      body: JSON.stringify({ requestedQuantity: 2, pickupMode: 'self' })
    });
    const claimData4 = await claimRes4.json();
    const reservationId4 = claimData4.reservation?._id;

    // Run sweeper
    console.log('Running Auto-Expire Sweeper...');
    await runAutoExpireSweeper();

    // Check that ingredient and reservation are NOT expired
    const finalIng = await Ingredient.findById(ingDoc4._id);
    const finalRes = await Reservation.findById(reservationId4);
    console.log('Ingredient status after sweeper (expected available):', finalIng.status);
    console.log('Reservation deliveryStatus after sweeper (expected claimed):', finalRes.deliveryStatus);
    if (finalIng.status === 'expired' || finalRes.deliveryStatus === 'expired') {
      throw new Error('Sweeper silently expired a claimed/reserved listing');
    }

    // Check delay warning sent (idempotent notification generated)
    console.log('Delay warning sent flag in DB:', finalRes.delayWarningSent);
    if (!finalRes.delayWarningSent) throw new Error('Expected delayWarningSent flag to be true');

    const notification = await Notification.findOne({ userRef: kitchenData.user.id, message: /delayed/ });
    console.log('Warning Notification created:', !!notification, 'Message:', notification?.message);
    if (!notification || !notification.message.includes('delayed')) {
      throw new Error('Expected delayed warning notification to be emitted');
    }

    // Run sweeper again to verify idempotency (no duplicate warnings)
    const initNotificationsCount = await Notification.countDocuments({ userRef: kitchenData.user.id });
    await runAutoExpireSweeper();
    const finalNotificationsCount = await Notification.countDocuments({ userRef: kitchenData.user.id });
    console.log(`Notification counts: initial = ${initNotificationsCount}, final = ${finalNotificationsCount}`);
    if (initNotificationsCount !== finalNotificationsCount) {
      throw new Error('Sweeper warning not idempotent: created duplicate notifications');
    }

    // Clean up test data
    await User.deleteMany({ email: { $in: [donorEmail, kitchenEmail] } });
    console.log('\n--- ALL TECHNICAL CORRECTIONS TESTS PASSED SUCCESSFULLY! ---');
    server.close();
    mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('\nverify_corrections.js FAILED with error:', error);
    server.close();
    mongoose.connection.close();
    process.exit(1);
  }
}

runTests();
