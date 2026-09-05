const BACKEND_URL = 'https://community-food-portal.onrender.com';
const FRONTEND_URL = 'https://community-food-portal.vercel.app';

async function testLiveDeployment() {
  console.log('================================================================');
  console.log('    AUTOMATED VALIDATION OF LIVE HOSTED PRODUCTION SYSTEM');
  console.log('    Frontend: ', FRONTEND_URL);
  console.log('    Backend:  ', BACKEND_URL);
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log('✅ PASS:', message);
      passed++;
    } else {
      console.error('❌ FAIL:', message);
      failed++;
    }
  }

  try {
    console.log('--- TEST GROUP 1: FRONTEND & ROUTING AVAILABILITY ---');
    const feRes = await fetch(FRONTEND_URL);
    const feHtml = await feRes.text();
    assert(feRes.status === 200, 'Frontend root (/) returns 200 OK');
    assert(feHtml.includes('root') || feHtml.includes('Community'), 'Frontend index.html contains SPA mount point');

    const feLoginRes = await fetch(FRONTEND_URL + '/login');
    assert(feLoginRes.status === 200, 'Direct access to SPA sub-route (/login) returns 200 OK without 404');

    console.log('\n--- TEST GROUP 2: BACKEND SECURITY & CORS POLICY ---');
    const corsRes = await fetch(BACKEND_URL + '/api/test/any', {
      headers: { 'Origin': FRONTEND_URL }
    });
    const allowOrigin = corsRes.headers.get('access-control-allow-origin');
    assert(allowOrigin === FRONTEND_URL || allowOrigin === '*', 'Live Backend returns matching Access-Control-Allow-Origin for Vercel');
    assert(corsRes.status === 401, 'Unauthenticated request to protected route is rejected with 401');

    console.log('\n--- TEST GROUP 3: DONOR ROLE WORKFLOWS ---');
    const donorLoginRes = await fetch(BACKEND_URL + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': FRONTEND_URL },
      body: JSON.stringify({ email: 'donor1@portal.com', password: 'password123' })
    });
    const donorData = await donorLoginRes.json();
    assert(donorLoginRes.status === 200 && !!donorData.token, 'Donor login succeeds and returns valid JWT token');
    assert(donorData.user && donorData.user.role === 'donor', 'Authenticated user role is verified as donor');

    const donorToken = donorData.token;
    const donorStatsRes = await fetch(BACKEND_URL + '/api/stats/donor', {
      headers: { 'Authorization': 'Bearer ' + donorToken, 'Origin': FRONTEND_URL }
    });
    const donorStats = await donorStatsRes.json();
    assert(donorStatsRes.status === 200 && typeof donorStats.totalIngredients === 'number', 'Donor statistics endpoint returns live database metrics');

    console.log('\n--- TEST GROUP 4: SOUP KITCHEN & GEOSPATIAL SEARCH ---');
    const kitchenLoginRes = await fetch(BACKEND_URL + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': FRONTEND_URL },
      body: JSON.stringify({ email: 'kitchen1@portal.com', password: 'password123' })
    });
    const kitchenData = await kitchenLoginRes.json();
    assert(kitchenLoginRes.status === 200 && !!kitchenData.token, 'Soup Kitchen login succeeds with JWT');

    const kitchenToken = kitchenData.token;
    const kitchenIngRes = await fetch(BACKEND_URL + '/api/kitchen/ingredients', {
      headers: { 'Authorization': 'Bearer ' + kitchenToken, 'Origin': FRONTEND_URL }
    });
    const kitchenIngs = await kitchenIngRes.json();
    assert(kitchenIngRes.status === 200 && Array.isArray(kitchenIngs), 'Kitchen discovers live available surplus ingredients feed');
    if (kitchenIngs.length > 0) {
      assert(typeof kitchenIngs[0].distance === 'number', 'Surplus listings contain computed geospatial distance (km)');
    }

    console.log('\n--- TEST GROUP 5: ADMIN & NETWORK REPUTATION LEDGER ---');
    const adminLoginRes = await fetch(BACKEND_URL + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': FRONTEND_URL },
      body: JSON.stringify({ email: 'admin@portal.com', password: 'password123' })
    });
    const adminData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200 && adminData.user.role === 'admin', 'Administrator login succeeds and role is verified');

    const adminToken = adminData.token;
    const ledgerRes = await fetch(BACKEND_URL + '/api/admin/network-ledger?page=1&limit=5', {
      headers: { 'Authorization': 'Bearer ' + adminToken, 'Origin': FRONTEND_URL }
    });
    const ledgerData = await ledgerRes.json();
    assert(ledgerRes.status === 200 && Array.isArray(ledgerData.docs), 'Network Reputation Ledger returns paginated leaderboard');

    const adminStatsRes = await fetch(BACKEND_URL + '/api/stats/admin', {
      headers: { 'Authorization': 'Bearer ' + adminToken, 'Origin': FRONTEND_URL }
    });
    const adminStats = await adminStatsRes.json();
    assert(adminStatsRes.status === 200 && typeof adminStats.totalIngredients === 'number', 'Global administrative analytics return system-wide totals');

    console.log('\n--- TEST GROUP 6: ACCESS CONTROL & SECURITY ENFORCEMENT ---');
    const forbiddenRes = await fetch(BACKEND_URL + '/api/test/admin', {
      headers: { 'Authorization': 'Bearer ' + donorToken, 'Origin': FRONTEND_URL }
    });
    assert(forbiddenRes.status === 403, 'Donor token attempting to access Admin endpoint is strictly blocked with 403 Forbidden');

    console.log('TOTAL TESTS: ' + (passed + failed) + ' | PASSED: ' + passed + ' | FAILED: ' + failed);
    if (failed === 0) {
      console.log('🎉 ALL LIVE CLOUD END-TO-END VALIDATIONS PASSED 100%! 🎉');
    } else {
      console.error('❌ SOME TESTS ENCOUNTERED FAILURES');
      process.exit(1);
    }
    console.log('================================================================');
  } catch (err) {
    console.error('Validation script execution error:', err);
    process.exit(1);
  }
}

testLiveDeployment();
