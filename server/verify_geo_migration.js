require('dotenv').config();
const mongoose = require('mongoose');
const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/community_food_portal';

const User = require('./models/User');
const Ingredient = require('./models/Ingredient');
const migrateGeo = require('./migrateGeo');

async function runTest() {
  await mongoose.connect(connStr);
  console.log('Connected to DB for migration test.');

  // Clear previous test resources if any
  await User.deleteMany({ name: /TestMigrationUser/ });
  await Ingredient.deleteMany({ name: /TestMigrationIng/ });

  // 1. Seed valid documents
  const user1 = new User({
    name: 'TestMigrationUser 1',
    email: 'testmig1@example.com',
    passwordHash: 'hash',
    role: 'donor',
    location: { lat: 12.34, lng: 56.78 },
    contactPerson: 'Jane Mig',
    authorityToDonate: true
  });
  await user1.save();

  const user2 = new User({
    name: 'TestMigrationUser 2',
    email: 'testmig2@example.com',
    passwordHash: 'hash',
    role: 'soup_kitchen',
    location: { lat: -23.45, lng: 120.56 }
  });
  await user2.save();

  const ing1 = new Ingredient({
    name: 'TestMigrationIng 1',
    category: 'Vegetables',
    quantity: 10,
    unit: 'kg',
    expiryDate: new Date(),
    pickupDeadline: new Date(),
    storageType: 'Cold',
    status: 'available',
    donorRef: user1._id,
    location: { lat: 45.67, lng: -89.12 },
    donorDeclaration: true
  });
  await ing1.save();

  // 2. Seed malformed documents (bypassing validation)
  const badUser = new User({
    name: 'TestMigrationUser Bad',
    email: 'testmigbad@example.com',
    passwordHash: 'hash',
    role: 'donor',
    location: { lat: null, lng: null }
  });
  await badUser.save({ validateBeforeSave: false });

  const badIng = new Ingredient({
    name: 'TestMigrationIng Bad',
    category: 'Vegetables',
    quantity: 10,
    unit: 'kg',
    expiryDate: new Date(),
    pickupDeadline: new Date(),
    storageType: 'Cold',
    status: 'approved',
    donorRef: user1._id,
    location: { lat: 45.67, lng: null },
    donorDeclaration: true
  });
  await badIng.save({ validateBeforeSave: false });

  // Strip locationGeo from valid documents to test migration logic re-hydration
  await User.updateMany({ _id: { $in: [user1._id, user2._id] } }, { $unset: { locationGeo: 1 } });
  await Ingredient.updateMany({ _id: ing1._id }, { $unset: { locationGeo: 1 } });

  console.log('Test documents seeded.');

  // Run the migration function
  await migrateGeo();

  // Assertions
  const checkU1 = await User.findById(user1._id);
  const checkU2 = await User.findById(user2._id);
  const checkI1 = await Ingredient.findById(ing1._id);
  const checkUBad = await User.findById(badUser._id);
  const checkIBad = await Ingredient.findById(badIng._id);

  const u1Passed = checkU1.locationGeo && checkU1.locationGeo.coordinates[0] === 56.78 && checkU1.locationGeo.coordinates[1] === 12.34;
  const u2Passed = checkU2.locationGeo && checkU2.locationGeo.coordinates[0] === 120.56 && checkU2.locationGeo.coordinates[1] === -23.45;
  const i1Passed = checkI1.locationGeo && checkI1.locationGeo.coordinates[0] === -89.12 && checkI1.locationGeo.coordinates[1] === 45.67;
  
  const badUserPassed = !checkUBad.locationGeo || !checkUBad.locationGeo.coordinates || checkUBad.locationGeo.coordinates.length === 0;
  const badIngPassed = !checkIBad.locationGeo || !checkIBad.locationGeo.coordinates || checkIBad.locationGeo.coordinates.length === 0;

  console.log('\n=== MIGRATION TEST RESULTS ===');
  console.log(`User 1 Migrated Correctly: ${u1Passed ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`User 2 Migrated Correctly: ${u2Passed ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`Ingredient 1 Migrated Correctly: ${i1Passed ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`Bad User Skipped Correctly: ${badUserPassed ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`Bad Ingredient Skipped Correctly: ${badIngPassed ? 'PASSED ✅' : 'FAILED ❌'}`);

  // Cleanup
  await User.deleteMany({ name: /TestMigrationUser/ });
  await Ingredient.deleteMany({ name: /TestMigrationIng/ });
  console.log('Cleanup complete.');

  const allPassed = u1Passed && u2Passed && i1Passed && badUserPassed && badIngPassed;
  await mongoose.connection.close();
  process.exit(allPassed ? 0 : 1);
}

runTest().catch(async (err) => {
  console.error(err);
  await mongoose.connection.close();
  process.exit(1);
});
