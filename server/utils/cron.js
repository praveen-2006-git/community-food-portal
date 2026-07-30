const Ingredient = require('../models/Ingredient');
const Request = require('../models/Request');
const Reservation = require('../models/Reservation');

const runAutoExpireSweeper = async () => {
  try {
    const now = new Date();
    
    // Find all ingredients that are pending, approved, or reserved but have passed their expiryDate or pickupDeadline
    const expiredIngredients = await Ingredient.find({
      status: { $in: ['pending', 'approved', 'reserved'] },
      $or: [
        { expiryDate: { $lt: now } },
        { pickupDeadline: { $lt: now } }
      ]
    }).select('_id name').lean();

    if (expiredIngredients.length === 0) {
      return;
    }

    console.log(`[Auto-Expire Scheduler] Found ${expiredIngredients.length} ingredients past their pickup deadlines.`);
    const expiredIngredientIds = expiredIngredients.map(ing => ing._id);

    // 1. Bulk mark ingredients status as expired
    await Ingredient.updateMany(
      { _id: { $in: expiredIngredientIds } },
      { $set: { status: 'expired' } }
    );
    expiredIngredients.forEach(ing => {
      console.log(`- Ingredient "${ing.name}" (${ing._id}) status set to 'expired'.`);
    });

    // 2. Find any associated Requests with status 'reserved' (meaning they were not picked up/fulfilled)
    const associatedRequests = await Request.find({
      ingredientRef: { $in: expiredIngredientIds },
      status: 'reserved'
    }).select('_id').lean();

    if (associatedRequests.length > 0) {
      const requestIds = associatedRequests.map(r => r._id);

      // 3. Bulk update associated Requests to 'expired'
      await Request.updateMany(
        { _id: { $in: requestIds } },
        { $set: { status: 'expired' } }
      );
      associatedRequests.forEach(req => {
        console.log(`  - Request (${req._id}) status set to 'expired'.`);
      });

      // 4. Bulk mark corresponding Reservations with deliveryStatus 'pending' as 'expired'
      const updatedReservations = await Reservation.updateMany(
        {
          requestRef: { $in: requestIds },
          deliveryStatus: 'pending'
        },
        {
          $set: { deliveryStatus: 'expired' }
        }
      );
      if (updatedReservations.modifiedCount > 0) {
        console.log(`    - Mark ${updatedReservations.modifiedCount} pending reservations as 'expired'.`);
      }
    }
  } catch (error) {
    console.error('[Auto-Expire Scheduler] Error running sweeper:', error);
  }
};

const startAutoExpireJob = (intervalMs = 30000) => {
  console.log(`[Auto-Expire Scheduler] Sweeper started. Running every ${intervalMs / 1000}s.`);
  // Run immediately on start
  runAutoExpireSweeper();
  
  // Schedule recurring sweep
  const intervalId = setInterval(runAutoExpireSweeper, intervalMs);
  return intervalId;
};

module.exports = {
  runAutoExpireSweeper,
  startAutoExpireJob
};
