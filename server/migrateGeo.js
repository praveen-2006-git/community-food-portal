const mongoose = require('mongoose');
const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/community_food_portal';

async function migrate() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(connStr);
  }
  
  const User = require('./models/User');
  const Ingredient = require('./models/Ingredient');

  console.log('Starting geospatial index migration...');

  // 1. Audit check
  const users = await User.find({}).lean();
  let skippedUsers = 0;
  const userOps = [];

  users.forEach(u => {
    if (!u.location || typeof u.location.lat !== 'number' || typeof u.location.lng !== 'number') {
      skippedUsers++;
    } else {
      userOps.push({
        updateOne: {
          filter: { _id: u._id },
          update: {
            $set: {
              locationGeo: {
                type: 'Point',
                coordinates: [u.location.lng, u.location.lat]
              }
            }
          }
        }
      });
    }
  });

  const ingredients = await Ingredient.find({}).lean();
  let skippedIngredients = 0;
  const ingOps = [];

  ingredients.forEach(i => {
    if (!i.location || typeof i.location.lat !== 'number' || typeof i.location.lng !== 'number') {
      skippedIngredients++;
    } else {
      ingOps.push({
        updateOne: {
          filter: { _id: i._id },
          update: {
            $set: {
              locationGeo: {
                type: 'Point',
                coordinates: [i.location.lng, i.location.lat]
              }
            }
          }
        }
      });
    }
  });

  console.log(`Pre-migration audit: Skipped ${skippedUsers} Users and ${skippedIngredients} Ingredients due to missing/malformed coordinates.`);

  if (userOps.length > 0) {
    console.log(`Migrating ${userOps.length} Users via bulkWrite...`);
    await User.bulkWrite(userOps);
  }

  if (ingOps.length > 0) {
    console.log(`Migrating ${ingOps.length} Ingredients via bulkWrite...`);
    await Ingredient.bulkWrite(ingOps);
  }

  console.log('Migration completed successfully.');
}

if (require.main === module) {
  migrate()
    .then(() => mongoose.connection.close())
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
} else {
  module.exports = migrate;
}
