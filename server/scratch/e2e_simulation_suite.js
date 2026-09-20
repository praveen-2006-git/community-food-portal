const mongoose = require('mongoose');
const assert = require('assert');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Ingredient = require('../models/Ingredient');
const Request = require('../models/Request');
const Reservation = require('../models/Reservation');
const IssueReport = require('../models/IssueReport');
const QualityReport = require('../models/QualityReport');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const WeeklyNeed = require('../models/WeeklyNeed');
const { runAutoExpireSweeper } = require('../utils/cron');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  modules: {}
};

function recordTest(moduleName, testName, passed, error = null) {
  stats.total++;
  if (!stats.modules[moduleName]) {
    stats.modules[moduleName] = { passed: 0, failed: 0, tests: [] };
  }
  if (passed) {
    stats.passed++;
    stats.modules[moduleName].passed++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    stats.failed++;
    stats.modules[moduleName].failed++;
    console.error(`  ❌ [FAIL] ${testName}`);
    if (error) console.error(`     Reason: ${error.message || error}`);
  }
  stats.modules[moduleName].tests.push({ testName, passed, error: error ? (error.message || String(error)) : null });
}

async function runE2ESimulation() {
  console.log('\n========================================================================');
  console.log('      SURPLUSLINK - FULL A-Z E2E AUTOMATED SIMULATION & TEST HARNESS     ');
  console.log('========================================================================\n');

  // Connect to DB directly for state inspections
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/community_food_portal';
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGODB_URI);
  }

  // Tokens & user references
  let donorLowToken, donorLowUser;
  let donorHighToken, donorHighUser;
  let kitchenToken, kitchenUser;
  let adminToken, adminUser;

  // Clean test namespace
  await User.deleteMany({ email: /@e2e-simulation\.org/ });
  await AuditLog.deleteMany({ actorEmail: /@e2e-simulation\.org/ });
  await Notification.deleteMany({});
  await WeeklyNeed.deleteMany({});

  // ---------------------------------------------------------------------------
  // MODULE 1: AUTHENTICATION, REGISTRATION & PROFILE LIFECYCLE
  // ---------------------------------------------------------------------------
  const MOD1 = 'M1: Auth & Profiles';
  console.log(`\n📌 RUNNING ${MOD1}...`);

  try {
    // 1.1 Weak password rejection
    const weakRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Weak User',
        email: 'weak@e2e-simulation.org',
        password: 'password123',
        role: 'donor',
        location: { lat: 11.5, lng: 77.2 },
        contactPerson: 'Weak Person',
        authorityToDonate: true
      })
    });
    assert.strictEqual(weakRes.status, 400);
    recordTest(MOD1, 'Reject common/weak passwords during registration', true);
  } catch (e) { recordTest(MOD1, 'Reject common/weak passwords during registration', false, e); }

  try {
    // 1.2 Public admin registration attempt blocked
    const adminRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker Admin',
        email: 'hackeradmin@e2e-simulation.org',
        password: 'SecurePassword123!',
        role: 'admin',
        location: { lat: 11.5, lng: 77.2 }
      })
    });
    assert.strictEqual(adminRegRes.status, 400);
    recordTest(MOD1, 'Block public registration of administrative accounts', true);
  } catch (e) { recordTest(MOD1, 'Block public registration of administrative accounts', false, e); }

  try {
    // 1.3 Register Low-Reputation Donor (score defaults to 100, we adjust to 70 for pending review tests)
    const donorLowReg = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'E2E Low-Rep Donor',
        email: 'donor_low@e2e-simulation.org',
        password: 'SecurePassword123!',
        role: 'donor',
        location: { lat: 11.5034, lng: 77.2444 },
        contactPerson: 'Suresh Kumar',
        authorityToDonate: true
      })
    });
    assert.strictEqual(donorLowReg.status, 201);
    const donorLowData = await donorLowReg.json();
    donorLowToken = donorLowData.token;
    donorLowUser = donorLowData.user;
    // Set score to 70
    await User.findByIdAndUpdate(donorLowUser.id, { reputationScore: 70 });
    recordTest(MOD1, 'Register low-reputation donor with operational declaration', true);
  } catch (e) { recordTest(MOD1, 'Register low-reputation donor with operational declaration', false, e); }

  try {
    // 1.4 Register High-Reputation Donor (score = 95 for auto-approval bypass)
    const donorHighReg = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'E2E High-Rep Hotel',
        email: 'donor_high@e2e-simulation.org',
        password: 'SecurePassword123!',
        role: 'donor',
        location: { lat: 11.5050, lng: 77.2400 },
        contactPerson: 'Chef Rajesh',
        authorityToDonate: true
      })
    });
    assert.strictEqual(donorHighReg.status, 201);
    const donorHighData = await donorHighReg.json();
    donorHighToken = donorHighData.token;
    donorHighUser = donorHighData.user;
    await User.findByIdAndUpdate(donorHighUser.id, { reputationScore: 95 });
    recordTest(MOD1, 'Register high-reputation donor (>80 reputation trust bypass)', true);
  } catch (e) { recordTest(MOD1, 'Register high-reputation donor (>80 reputation trust bypass)', false, e); }

  try {
    // 1.5 Register Soup Kitchen with Storage Capabilities
    const kitchenReg = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'E2E Annapoorna Kitchen',
        email: 'kitchen@e2e-simulation.org',
        password: 'SecurePassword123!',
        role: 'soup_kitchen',
        location: { lat: 11.5160, lng: 77.2340 },
        storageCapabilities: ['ambient', 'chilled', 'frozen']
      })
    });
    assert.strictEqual(kitchenReg.status, 201);
    const kitchenData = await kitchenReg.json();
    kitchenToken = kitchenData.token;
    kitchenUser = kitchenData.user;
    recordTest(MOD1, 'Register soup kitchen with multi-tier storage facilities', true);
  } catch (e) { recordTest(MOD1, 'Register soup kitchen with multi-tier storage facilities', false, e); }

  try {
    // 1.6 Login as Admin (using seeded admin or created admin)
    let adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@portal.com', password: 'password123' })
    });
    if (adminLoginRes.status !== 200) {
      // Create admin user if not existing
      const pHash = await bcrypt.hash('password123', 10);
      await User.findOneAndUpdate(
        { email: 'admin@portal.com' },
        { name: 'Portal Admin', email: 'admin@portal.com', passwordHash: pHash, role: 'admin', location: { lat: 11.5, lng: 77.2 }, isActive: true },
        { upsert: true, new: true }
      );
      adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@portal.com', password: 'password123' })
      });
    }
    assert.strictEqual(adminLoginRes.status, 200);
    const adminData = await adminLoginRes.json();
    adminToken = adminData.token;
    adminUser = adminData.user;
    recordTest(MOD1, 'Admin authentication and token issuance', true);
  } catch (e) { recordTest(MOD1, 'Admin authentication and token issuance', false, e); }

  try {
    // 1.7 Profile update for donor
    const profRes = await fetch(`${BASE_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorHighToken}` },
      body: JSON.stringify({
        typicalDonationSchedule: ['Mon 21:00', 'Fri 22:00'],
        typicalIngredientCategories: ['bakery', 'cooked', 'dairy']
      })
    });
    assert.strictEqual(profRes.status, 200);
    const profData = await profRes.json();
    assert.strictEqual(profData.user.typicalDonationSchedule.length, 2);
    recordTest(MOD1, 'Update donor operational profile & donation schedule', true);
  } catch (e) { recordTest(MOD1, 'Update donor operational profile & donation schedule', false, e); }

  // ---------------------------------------------------------------------------
  // MODULE 2: ROLE-BASED ACCESS CONTROL (RBAC) & SECURITY MATRIX
  // ---------------------------------------------------------------------------
  const MOD2 = 'M2: RBAC & Route Protection';
  console.log(`\n📌 RUNNING ${MOD2}...`);

  try {
    // 2.1 Donor accessing admin pending queue -> 403
    const res = await fetch(`${BASE_URL}/api/admin/ingredients/pending`, {
      headers: { 'Authorization': `Bearer ${donorLowToken}` }
    });
    assert.strictEqual(res.status, 403);
    recordTest(MOD2, 'Donor blocked from accessing Admin pending queue (403 Forbidden)', true);
  } catch (e) { recordTest(MOD2, 'Donor blocked from accessing Admin pending queue (403 Forbidden)', false, e); }

  try {
    // 2.2 Kitchen accessing donor upload endpoint -> 403
    const res = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kitchenToken}` },
      body: JSON.stringify({ name: 'Illegal item', category: 'vegetable', quantity: 5, unit: 'kg', expiryDate: new Date(), pickupDeadline: new Date(), storageType: 'ambient', location: { lat: 11.5, lng: 77.2 }, donorDeclaration: true })
    });
    assert.strictEqual(res.status, 403);
    recordTest(MOD2, 'Kitchen blocked from uploading surplus listings (403 Forbidden)', true);
  } catch (e) { recordTest(MOD2, 'Kitchen blocked from uploading surplus listings (403 Forbidden)', false, e); }

  try {
    // 2.3 Unauthenticated access to private route -> 401
    const res = await fetch(`${BASE_URL}/api/ingredients/my`);
    assert.strictEqual(res.status, 401);
    recordTest(MOD2, 'Unauthenticated request rejected with 401 Unauthorized', true);
  } catch (e) { recordTest(MOD2, 'Unauthenticated request rejected with 401 Unauthorized', false, e); }

  try {
    // 2.4 Tampered / invalid JWT signature -> 401
    const res = await fetch(`${BASE_URL}/api/ingredients/my`, {
      headers: { 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tamperedPayload.invalidSignature' }
    });
    assert.strictEqual(res.status, 401);
    recordTest(MOD2, 'Forged/tampered JWT rejected with 401 Unauthorized', true);
  } catch (e) { recordTest(MOD2, 'Forged/tampered JWT rejected with 401 Unauthorized', false, e); }

  // ---------------------------------------------------------------------------
  // MODULE 3: DONOR SURPLUS LISTINGS & ANTI-MALPRACTICE IMMUTABILITY
  // ---------------------------------------------------------------------------
  const MOD3 = 'M3: Donor Listings & Immutability';
  console.log(`\n📌 RUNNING ${MOD3}...`);

  let pendingListingId, bypassListingId;

  try {
    // 3.1 Validation: Past expiry date rejected
    const res = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorLowToken}` },
      body: JSON.stringify({
        name: 'Old Bread',
        category: 'bakery',
        quantity: 10,
        unit: 'loaves',
        expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
        pickupDeadline: new Date(Date.now() - 48 * 60 * 60 * 1000),
        storageType: 'ambient',
        location: { lat: 11.5034, lng: 77.2444 },
        donorDeclaration: true
      })
    });
    assert.strictEqual(res.status, 400);
    recordTest(MOD3, 'Reject past expiry date during batch creation', true);
  } catch (e) { recordTest(MOD3, 'Reject past expiry date during batch creation', false, e); }

  try {
    // 3.2 Validation: Pickup deadline after expiry rejected
    const res = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorLowToken}` },
      body: JSON.stringify({
        name: 'Invalid Timing Milk',
        category: 'dairy',
        quantity: 10,
        unit: 'litres',
        expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        pickupDeadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // after expiry
        storageType: 'chilled',
        location: { lat: 11.5034, lng: 77.2444 },
        donorDeclaration: true
      })
    });
    assert.strictEqual(res.status, 400);
    recordTest(MOD3, 'Reject pickup deadline exceeding expiration timestamp', true);
  } catch (e) { recordTest(MOD3, 'Reject pickup deadline exceeding expiration timestamp', false, e); }

  try {
    // 3.3 Create listing with Low Reputation (70 score) -> routed to 'pending' review
    const res = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorLowToken}` },
      body: JSON.stringify({
        name: 'Fresh Farm Spinach',
        category: 'vegetables', // mapped to vegetable
        quantity: 25,
        unit: 'kg',
        expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        pickupDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        storageType: 'ambient',
        location: { lat: 11.5034, lng: 77.2444 },
        donorDeclaration: true,
        dietaryType: 'veg',
        prepState: 'raw'
      })
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    pendingListingId = data._id;
    assert.strictEqual(data.status, 'pending');
    assert.strictEqual(data.category, 'vegetable');
    recordTest(MOD3, 'Low-reputation donor surplus routed to pending admin review', true);
  } catch (e) { recordTest(MOD3, 'Low-reputation donor surplus routed to pending admin review', false, e); }

  try {
    // 3.4 Anti-Malpractice Immutability: Donor attempting to alter expiry/pickup dates -> 400
    const res = await fetch(`${BASE_URL}/api/ingredients/${pendingListingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorLowToken}` },
      body: JSON.stringify({
        expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // trying to extend expiry
      })
    });
    assert.strictEqual(res.status, 400);
    const errBody = await res.json();
    assert.ok(errBody.message.includes('Security Violation'));
    recordTest(MOD3, 'Block donor attempt to tamper with expiry timestamp after submission', true);
  } catch (e) { recordTest(MOD3, 'Block donor attempt to tamper with expiry timestamp after submission', false, e); }

  try {
    // 3.5 Create listing with High Reputation (95 score) -> Trust Bypass directly to 'available'
    const res = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorHighToken}` },
      body: JSON.stringify({
        name: 'Whole Grain Sourdough',
        category: 'bakery',
        quantity: 40,
        unit: 'loaves',
        expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        pickupDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        storageType: 'ambient',
        location: { lat: 11.5050, lng: 77.2400 },
        donorDeclaration: true,
        dietaryType: 'veg',
        allergens: ['gluten']
      })
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    bypassListingId = data._id;
    assert.strictEqual(data.status, 'available');
    recordTest(MOD3, 'High-reputation (>80) donor bypasses review directly to available', true);
  } catch (e) { recordTest(MOD3, 'High-reputation (>80) donor bypasses review directly to available', false, e); }

  // ---------------------------------------------------------------------------
  // MODULE 4: ADMIN GOVERNANCE, QUALITY INSPECTION & AUDITING
  // ---------------------------------------------------------------------------
  const MOD4 = 'M4: Admin Governance & Auditing';
  console.log(`\n📌 RUNNING ${MOD4}...`);

  try {
    // 4.1 Admin fetches pending review queue
    const res = await fetch(`${BASE_URL}/api/admin/ingredients/pending`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const pendingList = await res.json();
    const found = pendingList.find(i => i._id === pendingListingId);
    assert.ok(found, 'Pending listing should appear in admin queue');
    recordTest(MOD4, 'Admin views pending verification queue with donor reputation info', true);
  } catch (e) { recordTest(MOD4, 'Admin views pending verification queue with donor reputation info', false, e); }

  try {
    // 4.2 Admin approves pending batch -> generates QualityReport and AuditLog
    const res = await fetch(`${BASE_URL}/api/admin/ingredients/${pendingListingId}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const approveData = await res.json();
    assert.strictEqual(approveData.ingredient.status, 'available');
    assert.ok(approveData.qualityReport, 'Quality report must be generated');

    // Verify AuditLog in DB
    const audit = await AuditLog.findOne({ action: 'approve_ingredient', targetId: pendingListingId });
    assert.ok(audit, 'AuditLog entry must be recorded for approval');
    recordTest(MOD4, 'Admin approves pending batch, generates QualityReport & AuditLog', true);
  } catch (e) { recordTest(MOD4, 'Admin approves pending batch, generates QualityReport & AuditLog', false, e); }

  try {
    // 4.3 Create a dummy pending batch to test rejection penalty
    const dummyRes = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorLowToken}` },
      body: JSON.stringify({
        name: 'Spoiled Tomatoes',
        category: 'vegetables',
        quantity: 15,
        unit: 'kg',
        expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        pickupDeadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        storageType: 'ambient',
        location: { lat: 11.5034, lng: 77.2444 },
        donorDeclaration: true
      })
    });
    const dummyData = await dummyRes.json();

    const rejectRes = await fetch(`${BASE_URL}/api/admin/ingredients/${dummyData._id}/reject`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(rejectRes.status, 200);
    const rejectData = await rejectRes.json();
    assert.strictEqual(rejectData.ingredient.status, 'rejected');
    assert.strictEqual(rejectData.donorReputationScore, 65); // 70 - 5 = 65

    const rejectAudit = await AuditLog.findOne({ action: 'reject_ingredient', targetId: dummyData._id });
    assert.ok(rejectAudit, 'AuditLog entry must be recorded for rejection');
    recordTest(MOD4, 'Admin rejects invalid batch, deducts 5 reputation points & logs audit', true);
  } catch (e) { recordTest(MOD4, 'Admin rejects invalid batch, deducts 5 reputation points & logs audit', false, e); }

  try {
    // 4.4 Admin network ledger endpoint
    const res = await fetch(`${BASE_URL}/api/admin/network-ledger?page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const ledger = await res.json();
    assert.ok(ledger.docs && ledger.docs.length > 0);
    recordTest(MOD4, 'Admin queries network trust ledger with pagination & sorting', true);
  } catch (e) { recordTest(MOD4, 'Admin queries network trust ledger with pagination & sorting', false, e); }

  // ---------------------------------------------------------------------------
  // MODULE 5: SOUP KITCHEN DISCOVERY & 15KM PROXIMITY ROUTING
  // ---------------------------------------------------------------------------
  const MOD5 = 'M5: 15km Proximity & Discovery';
  console.log(`\n📌 RUNNING ${MOD5}...`);

  try {
    // 5.1 Kitchen discovers approved ingredients within 15km
    const res = await fetch(`${BASE_URL}/api/kitchen/ingredients`, {
      headers: { 'Authorization': `Bearer ${kitchenToken}` }
    });
    assert.strictEqual(res.status, 200);
    const list = await res.json();
    assert.ok(Array.isArray(list));
    const foundSpinach = list.find(i => i._id === pendingListingId);
    assert.ok(foundSpinach, 'Spinach should be discovered within 15km');
    assert.ok(typeof foundSpinach.distance === 'number', 'Distance in km must be computed via Haversine');
    console.log(`     Discovered Spinach at calculated distance: ${foundSpinach.distance} km`);
    recordTest(MOD5, 'Kitchen discovers nearby batches sorted with Haversine distance', true);
  } catch (e) { recordTest(MOD5, 'Kitchen discovers nearby batches sorted with Haversine distance', false, e); }

  try {
    // 5.2 Out-of-bounds listing (>15km away) should be excluded
    const farDonor = await User.create({
      name: 'Faraway Donor',
      email: 'far_donor@e2e-simulation.org',
      passwordHash: await bcrypt.hash('Password123!', 10),
      role: 'donor',
      location: { lat: 10.5, lng: 76.5 }, // > 100km away
      locationGeo: { type: 'Point', coordinates: [76.5, 10.5] },
      reputationScore: 100,
      contactPerson: 'Far Person',
      authorityToDonate: true
    });
    const farIng = await Ingredient.create({
      name: 'Faraway Mangoes',
      category: 'vegetable',
      quantity: 50,
      unit: 'kg',
      expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      pickupDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      storageType: 'ambient',
      status: 'available',
      donorRef: farDonor._id,
      location: { lat: 10.5, lng: 76.5 },
      locationGeo: { type: 'Point', coordinates: [76.5, 10.5] },
      donorDeclaration: true
    });

    const res = await fetch(`${BASE_URL}/api/kitchen/ingredients`, {
      headers: { 'Authorization': `Bearer ${kitchenToken}` }
    });
    const list = await res.json();
    const foundFar = list.find(i => i._id === farIng._id.toString());
    assert.strictEqual(foundFar, undefined, 'Faraway ingredient must not appear in 15km local grid');
    recordTest(MOD5, '15km geographic threshold strictly excludes distant listings', true);
  } catch (e) { recordTest(MOD5, '15km geographic threshold strictly excludes distant listings', false, e); }

  // ---------------------------------------------------------------------------
  // MODULE 6: CONCURRENCY, RACE CONDITION & RESERVATION ATOMICITY
  // ---------------------------------------------------------------------------
  const MOD6 = 'M6: Concurrency & Atomicity';
  console.log(`\n📌 RUNNING ${MOD6}...`);

  let contestListingId;

  try {
    // 6.1 Create a limited batch of exactly 30kg Premium Apples
    const batchRes = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorHighToken}` },
      body: JSON.stringify({
        name: 'Contested Fuji Apples',
        category: 'vegetable',
        quantity: 30,
        unit: 'kg',
        expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        pickupDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        storageType: 'ambient',
        location: { lat: 11.5050, lng: 77.2400 },
        donorDeclaration: true
      })
    });
    const batchData = await batchRes.json();
    contestListingId = batchData._id;

    // 6.2 Simulate 6 concurrent kitchens/requests demanding 10kg each (total 60kg demanded for 30kg available)
    console.log('     Launching 6 simultaneous concurrent requests for 10kg each against 30kg supply...');
    const concurrentRequests = Array.from({ length: 6 }).map(() =>
      fetch(`${BASE_URL}/api/kitchen/ingredients/${contestListingId}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kitchenToken}` },
        body: JSON.stringify({ requestedQuantity: 10, pickupMode: 'self' })
      })
    );

    const responses = await Promise.all(concurrentRequests);
    const statuses = responses.map(r => r.status);
    const successes = statuses.filter(s => s === 201).length;
    const failures = statuses.filter(s => s === 400).length;

    console.log(`     Concurrent result: ${successes} succeeded (201), ${failures} rejected (400)`);
    assert.strictEqual(successes, 3, 'Exactly 3 requests of 10kg must succeed against 30kg pool');
    assert.strictEqual(failures, 3, 'Exactly 3 requests must be rejected to prevent inventory overdraft');

    // Inspect DB to ensure quantity is exactly 0 and never negative
    const dbIng = await Ingredient.findById(contestListingId);
    assert.strictEqual(dbIng.quantity, 0, 'Remaining quantity in DB must be exactly 0kg');
    recordTest(MOD6, 'Atomic race-condition prevention eliminates double-booking & negative stock', true);
  } catch (e) { recordTest(MOD6, 'Atomic race-condition prevention eliminates double-booking & negative stock', false, e); }

  try {
    // 6.3 Deletion Block: Donor cannot delete listing that has active reservations
    const delRes = await fetch(`${BASE_URL}/api/ingredients/${contestListingId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${donorHighToken}` }
    });
    assert.strictEqual(delRes.status, 400);
    const delBody = await delRes.json();
    assert.ok(delBody.message.includes('active reservations'));
    recordTest(MOD6, 'Block donor from deleting ingredients with active reservations', true);
  } catch (e) { recordTest(MOD6, 'Block donor from deleting ingredients with active reservations', false, e); }

  // ---------------------------------------------------------------------------
  // MODULE 7: 6-STAGE CUSTODY CHAIN & TOUCH OTP HANDOVER
  // ---------------------------------------------------------------------------
  const MOD7 = 'M7: Custody Chain & OTP Handover';
  console.log(`\n📌 RUNNING ${MOD7}...`);

  let sourdoughResId, plainOtp;

  try {
    // 7.1 Kitchen claims Sourdough bread
    const claimRes = await fetch(`${BASE_URL}/api/kitchen/ingredients/${bypassListingId}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kitchenToken}` },
      body: JSON.stringify({ requestedQuantity: 20, pickupMode: 'volunteer', volunteerName: 'Ravi Volunteer' })
    });
    assert.strictEqual(claimRes.status, 201);
    const claimData = await claimRes.json();
    sourdoughResId = claimData.reservation._id;
    plainOtp = claimData.reservation.pickupCode;
    assert.ok(plainOtp && plainOtp.length === 6, 'Plain 6-digit OTP must be returned to kitchen');

    // Inspect DB directly to verify SHA-256 hash security
    const dbRes = await Reservation.findById(sourdoughResId);
    assert.notStrictEqual(dbRes.pickupCode, plainOtp, 'Database MUST NOT store plaintext OTP');
    assert.ok(/^[0-9a-fA-F]{64}$/.test(dbRes.pickupCode), 'Database must store 64-char SHA-256 digest');
    recordTest(MOD7, 'Generate 6-digit OTP and store cryptographic SHA-256 digest in DB', true);
  } catch (e) { recordTest(MOD7, 'Generate 6-digit OTP and store cryptographic SHA-256 digest in DB', false, e); }

  try {
    // 7.2 Kitchen marks delivery status as pickup_scheduled
    const schedRes = await fetch(`${BASE_URL}/api/kitchen/reservations/${sourdoughResId}/delivery-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kitchenToken}` },
      body: JSON.stringify({ deliveryStatus: 'pickup_scheduled' })
    });
    assert.strictEqual(schedRes.status, 200);
    const schedData = await schedRes.json();
    assert.strictEqual(schedData.reservation.deliveryStatus, 'pickup_scheduled');
    recordTest(MOD7, 'Transition reservation status to pickup_scheduled', true);
  } catch (e) { recordTest(MOD7, 'Transition reservation status to pickup_scheduled', false, e); }

  try {
    // 7.3 Donor attempts verification with wrong OTP -> fails with 400 and increments failedAttempts
    const badVerifyRes = await fetch(`${BASE_URL}/api/reservations/${sourdoughResId}/verify-pickup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorHighToken}` },
      body: JSON.stringify({ enteredCode: '000000' })
    });
    assert.strictEqual(badVerifyRes.status, 400);
    const dbRes = await Reservation.findById(sourdoughResId);
    assert.strictEqual(dbRes.failedAttempts, 1);
    recordTest(MOD7, 'Reject invalid OTP, increment failed attempts counter', true);
  } catch (e) { recordTest(MOD7, 'Reject invalid OTP, increment failed attempts counter', false, e); }

  try {
    // 7.4 Trigger lockout with 2 more failures -> lock code
    await fetch(`${BASE_URL}/api/reservations/${sourdoughResId}/verify-pickup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorHighToken}` },
      body: JSON.stringify({ enteredCode: '111111' })
    });
    await fetch(`${BASE_URL}/api/reservations/${sourdoughResId}/verify-pickup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorHighToken}` },
      body: JSON.stringify({ enteredCode: '222222' })
    });

    const lockedVerify = await fetch(`${BASE_URL}/api/reservations/${sourdoughResId}/verify-pickup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorHighToken}` },
      body: JSON.stringify({ enteredCode: plainOtp }) // even right code should now fail
    });
    assert.strictEqual(lockedVerify.status, 400);
    const lockedMsg = await lockedVerify.json();
    assert.ok(lockedMsg.message.includes('locked'));
    recordTest(MOD7, 'Lock OTP verification after 3 consecutive failed attempts', true);
  } catch (e) { recordTest(MOD7, 'Lock OTP verification after 3 consecutive failed attempts', false, e); }

  try {
    // 7.5 Kitchen regenerates code -> resets lock and generates fresh OTP
    const regenRes = await fetch(`${BASE_URL}/api/reservations/${sourdoughResId}/regenerate-code`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${kitchenToken}` }
    });
    assert.strictEqual(regenRes.status, 200);
    const regenData = await regenRes.json();
    plainOtp = regenData.pickupCode;
    assert.ok(plainOtp && plainOtp.length === 6);
    recordTest(MOD7, 'Kitchen regenerates fresh OTP and resets lockout counter', true);
  } catch (e) { recordTest(MOD7, 'Kitchen regenerates fresh OTP and resets lockout counter', false, e); }

  try {
    // 7.6 Donor verifies with new correct OTP -> transitions to handed_over, clears OTP hash
    const goodVerifyRes = await fetch(`${BASE_URL}/api/reservations/${sourdoughResId}/verify-pickup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorHighToken}` },
      body: JSON.stringify({ enteredCode: plainOtp })
    });
    assert.strictEqual(goodVerifyRes.status, 200);
    const goodData = await goodVerifyRes.json();
    assert.strictEqual(goodData.reservation.deliveryStatus, 'handed_over');
    assert.strictEqual(goodData.reservation.pickupConfirmedByDonor, true);

    // Verify single-use: replay attempt must fail
    const replayRes = await fetch(`${BASE_URL}/api/reservations/${sourdoughResId}/verify-pickup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorHighToken}` },
      body: JSON.stringify({ enteredCode: plainOtp })
    });
    assert.strictEqual(replayRes.status, 400);
    recordTest(MOD7, 'Verify correct OTP, transition to handed_over & enforce single-use replay protection', true);
  } catch (e) { recordTest(MOD7, 'Verify correct OTP, transition to handed_over & enforce single-use replay protection', false, e); }

  try {
    // 7.7 Kitchen marks delivery completed -> auto-increments kitchen inventory and notifies donor
    const completeRes = await fetch(`${BASE_URL}/api/kitchen/reservations/${sourdoughResId}/delivery-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kitchenToken}` },
      body: JSON.stringify({
        deliveryStatus: 'completed',
        receivedQuantity: 20,
        condition: 'good'
      })
    });
    assert.strictEqual(completeRes.status, 200);

    // Verify kitchen pantry inventory credited
    const kitchenDb = await User.findById(kitchenUser.id);
    const invItem = kitchenDb.inventory.find(i => i.name.toLowerCase().includes('sourdough'));
    assert.ok(invItem, 'Sourdough must be credited into kitchen inventory');
    assert.strictEqual(invItem.quantity, 20);

    // Verify notification sent to donor
    const donorNotif = await Notification.findOne({ userRef: donorHighUser.id, message: /successfully delivered/ });
    assert.ok(donorNotif, 'Donor must receive delivery completion notification');
    recordTest(MOD7, 'Delivery completion auto-increments kitchen pantry & dispatches donor notification', true);
  } catch (e) { recordTest(MOD7, 'Delivery completion auto-increments kitchen pantry & dispatches donor notification', false, e); }

  // ---------------------------------------------------------------------------
  // MODULE 8: KITCHEN PANTRY INVENTORY & FEFO ORDERING
  // ---------------------------------------------------------------------------
  const MOD8 = 'M8: Pantry Inventory & FEFO';
  console.log(`\n📌 RUNNING ${MOD8}...`);

  try {
    // 8.1 Kitchen logs daily consumption
    const consumeRes = await fetch(`${BASE_URL}/api/kitchen/inventory/consume`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kitchenToken}` },
      body: JSON.stringify({ name: 'Whole Grain Sourdough', quantity: 5 })
    });
    assert.strictEqual(consumeRes.status, 200);
    const consumeData = await consumeRes.json();
    const item = consumeData.inventory.find(i => i.name === 'Whole Grain Sourdough');
    assert.strictEqual(item.quantity, 15);
    recordTest(MOD8, 'Log daily pantry food consumption and update balance', true);
  } catch (e) { recordTest(MOD8, 'Log daily pantry food consumption and update balance', false, e); }

  try {
    // 8.2 Reject consumption exceeding available balance
    const overConsumeRes = await fetch(`${BASE_URL}/api/kitchen/inventory/consume`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kitchenToken}` },
      body: JSON.stringify({ name: 'Whole Grain Sourdough', quantity: 100 })
    });
    assert.strictEqual(overConsumeRes.status, 400);
    recordTest(MOD8, 'Prevent inventory overdraft during consumption logging', true);
  } catch (e) { recordTest(MOD8, 'Prevent inventory overdraft during consumption logging', false, e); }

  try {
    // 8.3 Declare kitchen weekly needs
    const needRes = await fetch(`${BASE_URL}/api/kitchen/needs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kitchenToken}` },
      body: JSON.stringify({
        ingredientName: 'Basmati Rice',
        quantity: 100,
        unit: 'kg',
        priority: 'urgent'
      })
    });
    assert.strictEqual(needRes.status, 201);

    // Donor queries active needs
    const donorNeedsRes = await fetch(`${BASE_URL}/api/ingredients/active-needs`, {
      headers: { 'Authorization': `Bearer ${donorHighToken}` }
    });
    assert.strictEqual(donorNeedsRes.status, 200);
    const donorNeeds = await donorNeedsRes.json();
    const foundRice = donorNeeds.find(n => n.ingredientName === 'Basmati Rice');
    assert.ok(foundRice, 'Declared kitchen need must be visible to prospective donors');
    recordTest(MOD8, 'Declare kitchen weekly needs and broadcast to donor portal', true);
  } catch (e) { recordTest(MOD8, 'Declare kitchen weekly needs and broadcast to donor portal', false, e); }

  // ---------------------------------------------------------------------------
  // MODULE 9: QUALITY DISPUTE, RESOLUTION & REPUTATION PENALTY
  // ---------------------------------------------------------------------------
  const MOD9 = 'M9: Quality Reports & Disputes';
  console.log(`\n📌 RUNNING ${MOD9}...`);

  let disputeListing, disputeRes, issueReportId;

  try {
    // 9.1 Create and complete a damaged batch to file dispute on
    const dBatch = await Ingredient.create({
      name: 'Spoiled Milk Batch',
      category: 'dairy',
      quantity: 10,
      unit: 'litres',
      expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      pickupDeadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      storageType: 'chilled',
      status: 'available',
      donorRef: donorLowUser.id,
      location: { lat: 11.5034, lng: 77.2444 },
      locationGeo: { type: 'Point', coordinates: [77.2444, 11.5034] },
      donorDeclaration: true
    });
    const dReq = await Request.create({
      soupKitchenRef: kitchenUser.id,
      ingredientRef: dBatch._id,
      requestedQuantity: 10,
      status: 'handed_over',
      pickupMode: 'self'
    });
    disputeRes = await Reservation.create({
      requestRef: dReq._id,
      reservedQuantity: 10,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      deliveryStatus: 'handed_over',
      pickupCode: 'used',
      pickupConfirmedByDonor: true
    });

    // Kitchen submits issue report
    const issueRes = await fetch(`${BASE_URL}/api/issue-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kitchenToken}` },
      body: JSON.stringify({
        reservationRef: disputeRes._id,
        reason: 'Milk was curdled upon opening package.',
        proofDescription: 'Severe foul odor and separated whey.'
      })
    });
    assert.strictEqual(issueRes.status, 201);
    const issueData = await issueRes.json();
    issueReportId = issueData._id;
    assert.strictEqual(issueData.status, 'pending');
    recordTest(MOD9, 'Kitchen submits food quality dispute report with observational proof', true);
  } catch (e) { recordTest(MOD9, 'Kitchen submits food quality dispute report with observational proof', false, e); }

  try {
    // 9.2 Block duplicate pending reports for same reservation
    const dupRes = await fetch(`${BASE_URL}/api/issue-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kitchenToken}` },
      body: JSON.stringify({
        reservationRef: disputeRes._id,
        reason: 'Second complaint.',
        proofDescription: 'Duplicate.'
      })
    });
    assert.strictEqual(dupRes.status, 400);
    recordTest(MOD9, 'Prevent duplicate pending issue reports for the same transaction', true);
  } catch (e) { recordTest(MOD9, 'Prevent duplicate pending issue reports for the same transaction', false, e); }

  try {
    // 9.3 Admin resolves issue report as 'upheld' -> deducts 15 reputation points from donor
    const scoreBefore = (await User.findById(donorLowUser.id)).reputationScore;

    const resolveRes = await fetch(`${BASE_URL}/api/issue-reports/${issueReportId}/resolve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'upheld' })
    });
    assert.strictEqual(resolveRes.status, 200);

    const scoreAfter = (await User.findById(donorLowUser.id)).reputationScore;
    assert.strictEqual(scoreAfter, scoreBefore - 15, 'Upheld issue must deduct exactly 15 reputation points');

    const disputeAudit = await AuditLog.findOne({ action: 'resolve_dispute', targetId: issueReportId });
    assert.ok(disputeAudit, 'AuditLog entry must be recorded for dispute resolution');
    recordTest(MOD9, 'Admin upholds dispute, penalizes donor with 15-point reputation reduction & logs audit', true);
  } catch (e) { recordTest(MOD9, 'Admin upholds dispute, penalizes donor with 15-point reputation reduction & logs audit', false, e); }

  // ---------------------------------------------------------------------------
  // MODULE 10: MULTI-STOP TSP ROUTING OPTIMIZER
  // ---------------------------------------------------------------------------
  const MOD10 = 'M10: Multi-Stop TSP Routing';
  console.log(`\n📌 RUNNING ${MOD10}...`);

  try {
    // 10.1 Multi-stop basket routing calculation
    const routeRes = await fetch(`${BASE_URL}/api/kitchen/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kitchenToken}` },
      body: JSON.stringify({
        source: 'basket',
        basketItems: [
          { ingredientId: pendingListingId, name: 'Spinach', quantity: 10, unit: 'kg', location: { lat: 11.5034, lng: 77.2444 }, donorName: 'Farm' },
          { ingredientId: bypassListingId, name: 'Bread', quantity: 20, unit: 'loaves', location: { lat: 11.5050, lng: 77.2400 }, donorName: 'Hotel' }
        ]
      })
    });
    assert.strictEqual(routeRes.status, 200);
    const routeData = await routeRes.json();
    assert.strictEqual(routeData.sequence.length, 2);
    assert.ok(typeof routeData.totalDistance === 'number' && routeData.totalDistance > 0);
    assert.ok(routeData.roadGeometry && routeData.roadGeometry.length > 0);
    console.log(`     TSP route calculated: ${routeData.sequence.length} stops, total distance: ${routeData.totalDistance.toFixed(2)} km, mode: ${routeData.routingType}`);
    recordTest(MOD10, 'Calculate optimized Nearest-Neighbor TSP sequence and return-leg circuit', true);
  } catch (e) { recordTest(MOD10, 'Calculate optimized Nearest-Neighbor TSP sequence and return-leg circuit', false, e); }

  // ---------------------------------------------------------------------------
  // MODULE 11: NOTIFICATIONS & BACKGROUND EXPIRY SWEEPER CRON
  // ---------------------------------------------------------------------------
  const MOD11 = 'M11: Notifications & Auto-Expiry';
  console.log(`\n📌 RUNNING ${MOD11}...`);

  try {
    // 11.1 In-app notification read states
    const notifRes = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { 'Authorization': `Bearer ${donorHighToken}` }
    });
    assert.strictEqual(notifRes.status, 200);
    const notifData = await notifRes.json();
    assert.ok(Array.isArray(notifData.notifications));
    const unread = notifData.unreadCount;

    // Mark all as read
    const readAllRes = await fetch(`${BASE_URL}/api/notifications/read-all`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${donorHighToken}` }
    });
    assert.strictEqual(readAllRes.status, 200);

    const notifRes2 = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { 'Authorization': `Bearer ${donorHighToken}` }
    });
    const notifData2 = await notifRes2.json();
    assert.strictEqual(notifData2.unreadCount, 0);
    recordTest(MOD11, 'Fetch notification feed and mark-all-as-read lifecycle', true);
  } catch (e) { recordTest(MOD11, 'Fetch notification feed and mark-all-as-read lifecycle', false, e); }

  try {
    // 11.2 Auto-expire sweeper on unclaimed past-expiry listing
    const expiredIng = await Ingredient.create({
      name: 'Unclaimed Expired Milk',
      category: 'dairy',
      quantity: 10,
      unit: 'litres',
      expiryDate: new Date(Date.now() - 3600 * 1000), // 1 hour ago
      pickupDeadline: new Date(Date.now() - 7200 * 1000),
      storageType: 'chilled',
      status: 'available',
      donorRef: donorHighUser.id,
      location: { lat: 11.5, lng: 77.2 },
      locationGeo: { type: 'Point', coordinates: [77.2, 11.5] },
      donorDeclaration: true
    });

    await runAutoExpireSweeper();

    const updatedExpired = await Ingredient.findById(expiredIng._id);
    assert.strictEqual(updatedExpired.status, 'expired', 'Sweeper must transition past-expiry listings to expired');
    recordTest(MOD11, 'Background sweeper transitions past-expiry surplus listings to expired', true);
  } catch (e) { recordTest(MOD11, 'Background sweeper transitions past-expiry surplus listings to expired', false, e); }

  // ---------------------------------------------------------------------------
  // CLEANUP & FINAL REPORT
  // ---------------------------------------------------------------------------
  await User.deleteMany({ email: /@e2e-simulation\.org/ });
  await AuditLog.deleteMany({ actorEmail: /@e2e-simulation\.org/ });

  console.log('\n========================================================================');
  console.log('                 FINAL TEST & SIMULATION SUMMARY REPORT                 ');
  console.log('========================================================================');
  console.log(`TOTAL TESTS EXECUTED : ${stats.total}`);
  console.log(`PASSED               : ${stats.passed} ✅`);
  console.log(`FAILED               : ${stats.failed} ❌`);
  console.log(`SUCCESS RATE         : ${((stats.passed / stats.total) * 100).toFixed(1)}%`);
  console.log('------------------------------------------------------------------------');

  for (const [mod, data] of Object.entries(stats.modules)) {
    const rate = ((data.passed / (data.passed + data.failed)) * 100).toFixed(0);
    const icon = data.failed === 0 ? '✅' : '❌';
    console.log(`${icon} ${mod.padEnd(35)} : ${data.passed}/${data.passed + data.failed} passed (${rate}%)`);
  }
  console.log('========================================================================\n');

  if (stats.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runE2ESimulation().catch(err => {
  console.error('Fatal Simulation Error:', err);
  process.exit(1);
});
