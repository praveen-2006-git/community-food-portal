const Notification = require('../models/Notification');
const User = require('../models/User');

async function notifyNearbyKitchens(ingredient) {
  try {
    if (!ingredient || !ingredient.locationGeo || !ingredient.locationGeo.coordinates) {
      console.warn('[Notifier] Ingredient locationGeo coordinates missing. Skipping notification.');
      return;
    }

    // Convert storageType to lowercase for matching
    const storageType = (ingredient.storageType || '').toLowerCase().trim();

    const kitchens = await User.find({
      role: 'soup_kitchen',
      isActive: true,
      $or: [
        { storageCapabilities: storageType },
        { storageCapabilities: { $size: 0 } }
      ],
      locationGeo: {
        $near: {
          $geometry: { type: 'Point', coordinates: ingredient.locationGeo.coordinates },
          $maxDistance: parseInt(process.env.MAX_RADIUS_METRES) || 15000
        }
      }
    });

    const notifications = kitchens.map(kitchen => ({
      userRef: kitchen._id,
      message: `New ${ingredient.category} listing nearby: ${ingredient.name} (${ingredient.quantity} ${ingredient.unit}). Pickup by ${new Date(ingredient.pickupDeadline).toLocaleDateString()}.`,
      isRead: false
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (error) {
    console.error('[Notifier] Failed to notify nearby kitchens:', error);
  }
}

module.exports = { notifyNearbyKitchens };
