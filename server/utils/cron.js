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
    });

    if (expiredIngredients.length > 0) {
      console.log(`[Auto-Expire Scheduler] Found ${expiredIngredients.length} ingredients past their pickup deadlines.`);
    }

    for (const ingredient of expiredIngredients) {
      // 1. Mark ingredient status as expired
      ingredient.status = 'expired';
      await ingredient.save();
      console.log(`- Ingredient "${ingredient.name}" (${ingredient._id}) status set to 'expired'.`);

      // 2. Find any associated Requests with status 'reserved' (meaning they were not picked up/fulfilled)
      const associatedRequests = await Request.find({
        ingredientRef: ingredient._id,
        status: 'reserved'
      });

      for (const req of associatedRequests) {
        req.status = 'expired';
        await req.save();
        console.log(`  - Request (${req._id}) status set to 'expired'.`);

        // 3. Find any corresponding Reservations with deliveryStatus 'pending' and mark as 'expired'
        const updatedReservations = await Reservation.updateMany(
          {
            requestRef: req._id,
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
