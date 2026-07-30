const assert = require('assert');

async function runTests() {
  console.log('\n--- STARTING CORS ORIGIN CONSTRAINTS TESTS ---');

  // Save current env variables to restore later
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFrontendUrl = process.env.FRONTEND_URL;

  // Clear require cache for server index so we can re-evaluate it
  const clearServerCache = () => {
    delete require.cache[require.resolve('./index')];
    delete require.cache[require.resolve('./utils/cron')];
  };

  try {
    // TEST 1: In production mode, missing FRONTEND_URL must throw a fatal error
    console.log('TEST 1: Production mode with missing FRONTEND_URL...');
    process.env.NODE_ENV = 'production';
    delete process.env.FRONTEND_URL;
    clearServerCache();

    assert.throws(
      () => {
        require('./index');
      },
      /FRONTEND_URL environment variable is missing in production/,
      'Should throw an error if FRONTEND_URL is missing in production'
    );
    console.log('TEST 1 RESULT: PASSED ✅ (Fatal error thrown correctly)');

    // TEST 2: In production mode, presence of FRONTEND_URL starts server successfully
    console.log('\nTEST 2: Production mode with valid FRONTEND_URL...');
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://my-production-portal.org';
    clearServerCache();

    const { server } = require('./index');
    assert.ok(server, 'Server should start successfully when FRONTEND_URL is set in production');
    console.log('TEST 2 RESULT: PASSED ✅ (Server started successfully)');

    // TEST 3: Allowed vs Disallowed Origin requests
    console.log('\nTEST 3: Verifying CORS origin rejection / acceptance...');
    
    // Request from ALLOWED origin
    const allowedRes = await fetch('http://localhost:5000', {
      headers: { 'Origin': 'https://my-production-portal.org' }
    });
    const allowedCorsHeader = allowedRes.headers.get('access-control-allow-origin');
    console.log('Allowed Origin Response CORS header:', allowedCorsHeader);
    assert.strictEqual(allowedCorsHeader, process.env.FRONTEND_URL, 'Should allow access-control-allow-origin matching FRONTEND_URL');

    // Request from DISALLOWED origin
    const disallowedRes = await fetch('http://localhost:5000', {
      headers: { 'Origin': 'https://evil-hacker.com' }
    });
    const disallowedCorsHeader = disallowedRes.headers.get('access-control-allow-origin');
    console.log('Disallowed Origin Response CORS header:', disallowedCorsHeader);
    assert.ok(disallowedCorsHeader === null || disallowedCorsHeader === process.env.FRONTEND_URL, 'CORS header must be absent or equal to the allowed FRONTEND_URL for disallowed origins');

    console.log('TEST 3 RESULT: PASSED ✅ (CORS origin routing verified correctly)');

    // Close the server to release the port
    server.close();
    console.log('Server shut down cleanly.');

  } catch (error) {
    console.error('CORS verification failed:', error);
    process.exit(1);
  } finally {
    // Restore original env variables
    process.env.NODE_ENV = originalNodeEnv;
    process.env.FRONTEND_URL = originalFrontendUrl;
    clearServerCache();
  }

  console.log('\n--- ALL CORS TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

runTests();
