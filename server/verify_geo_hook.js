const mongoose = require('mongoose');
const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/community_food_portal';

const User = require('./models/User');

async function runTest() {
  await mongoose.connect(connStr);
  console.log('Connected to DB for hook lifecycle test.');

  // Clear previous test resources if any
  await User.deleteMany({ name: /TestHookUser/ });

  // 1. Initial Creation Assertion
  const user = new User({
    name: 'TestHookUser 1',
    email: 'testhook1@example.com',
    passwordHash: 'hash',
    role: 'donor',
    location: { lat: 10, lng: 20 }
  });
  await user.save();

  const check1 = await User.findById(user._id);
  const creationPassed = check1.locationGeo && 
                         check1.locationGeo.coordinates[0] === 20 && 
                         check1.locationGeo.coordinates[1] === 10;

  // 2. Coordinate Update Assertion
  check1.location = { lat: 15, lng: 25 };
  await check1.save();

  const check2 = await User.findById(user._id);
  const updatePassed = check2.locationGeo && 
                       check2.locationGeo.coordinates[0] === 25 && 
                       check2.locationGeo.coordinates[1] === 15;

  // 3. Non-Coordinate Update Assertion
  check2.name = 'TestHookUser Updated Name';
  await check2.save();

  const check3 = await User.findById(user._id);
  const nonGeoUpdatePassed = check3.locationGeo && 
                             check3.locationGeo.coordinates[0] === 25 && 
                             check3.locationGeo.coordinates[1] === 15 &&
                             check3.name === 'TestHookUser Updated Name';

  console.log('\n=== SCHEMA HOOK TEST RESULTS ===');
  console.log(`Initial locationGeo population: ${creationPassed ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`Update locationGeo sync: ${updatePassed ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`Non-geospatial update preservation: ${nonGeoUpdatePassed ? 'PASSED ✅' : 'FAILED ❌'}`);

  // Cleanup
  await User.deleteMany({ name: /TestHookUser/ });
  console.log('Cleanup complete.');

  const allPassed = creationPassed && updatePassed && nonGeoUpdatePassed;
  await mongoose.connection.close();
  process.exit(allPassed ? 0 : 1);
}

runTest().catch(async (err) => {
  console.error(err);
  await mongoose.connection.close();
  process.exit(1);
});
