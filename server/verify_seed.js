const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Ingredient = require('./models/Ingredient');

function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

const verify = async () => {
  await connectDB();
  
  const userCount = await User.countDocuments();
  const ingredientCount = await Ingredient.countDocuments();

  console.log(`Verified counts in database:`);
  console.log(`- Users: ${userCount}`);
  console.log(`- Ingredients: ${ingredientCount}`);

  // Test distance calculation between seeded entries
  const donor = await User.findOne({ name: 'Local Supermarket' });
  const kitchen = await User.findOne({ name: 'Community Care Kitchen' });

  if (donor && kitchen) {
    const dist = getHaversineDistance(
      donor.location.lat,
      donor.location.lng,
      kitchen.location.lat,
      kitchen.location.lng
    );
    console.log(`Distance between "${donor.name}" and "${kitchen.name}": ${dist.toFixed(2)} km`);
  }

  mongoose.connection.close();
};

verify();
