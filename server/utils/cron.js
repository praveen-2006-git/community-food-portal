const Ingredient = require('../models/Ingredient');
const Request = require('../models/Request');
const Reservation = require('../models/Reservation');

const runAutoExpireSweeper = async () => {
  try {
    const now = new Date();
    
    // Find all ingredients that are pending or available and past their expiryDate or pickupDeadline
    const expiredIngredientsCandidate = await Ingredient.find({
      status: { $in: ['pending', 'available'] },
      $or: [
        { expiryDate: { $lt: now } },
        { pickupDeadline: { $lt: now } }
      ]
    });

    const expiredIngredients = [];
    for (const ing of expiredIngredientsCandidate) {
      // Find requests referencing this ingredient
      const requests = await Request.find({ ingredientRef: ing._id }).select('_id').lean();
      const requestIds = requests.map(r => r._id);
      
      // Check if there is any active reservation for these requests
      const activeRes = await Reservation.findOne({
        requestRef: { $in: requestIds },
        deliveryStatus: { $in: ['pending', 'claimed', 'pickup_scheduled'] }
      }).lean();

      if (!activeRes) {
        expiredIngredients.push(ing);
      }
    }

    if (expiredIngredients.length > 0) {
      console.log(`[Auto-Expire Scheduler] Found ${expiredIngredients.length} unreserved ingredients past their deadlines.`);
      const expiredIngredientIds = expiredIngredients.map(ing => ing._id);

      // 1. Bulk mark ingredients status as expired
      await Ingredient.updateMany(
        { _id: { $in: expiredIngredientIds } },
        { $set: { status: 'expired' } }
      );
      expiredIngredients.forEach(ing => {
        console.log(`- Ingredient "${ing.name}" (${ing._id}) status set to 'expired'.`);
      });

      // 2. Find any associated Requests with status 'pending'
      const associatedRequests = await Request.find({
        ingredientRef: { $in: expiredIngredientIds },
        status: 'pending'
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
      }
    }

    // Process delayed reservations idempotently
    const delayedReservations = await Reservation.find({
      deliveryStatus: { $in: ['claimed', 'pickup_scheduled'] },
      delayWarningSent: { $ne: true }
    }).populate({
      path: 'requestRef',
      populate: {
        path: 'ingredientRef'
      }
    });

    for (const resDoc of delayedReservations) {
      if (resDoc.requestRef && resDoc.requestRef.ingredientRef) {
        const ing = resDoc.requestRef.ingredientRef;
        const deadline = ing.pickupDeadline || ing.expiryDate;
        if (deadline && new Date(deadline) < now) {
          console.warn(`[Auto-Expire Scheduler] Pickup delay warning: Reservation ${resDoc._id} is delayed for ingredient "${ing.name}".`);
          
          // Emit notification to soup kitchen
          const Notification = require('../models/Notification');
          const delayNotification = new Notification({
            userRef: resDoc.requestRef.soupKitchenRef,
            message: `Warning: Pickup for ingredient ${ing.name} is delayed. Please complete the handover.`,
            isRead: false
          });
          await delayNotification.save();

          resDoc.delayWarningSent = true;
          await resDoc.save();
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
