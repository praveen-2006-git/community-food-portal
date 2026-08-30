const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { hashPickupCode } = require('./security');

const runMigration = async () => {
  const isDryRun = process.env.MIGRATION_DRY_RUN === 'true';

  try {
    const Ingredient = mongoose.model('Ingredient');
    const Reservation = mongoose.model('Reservation');
    const Request = mongoose.model('Request');

    if (isDryRun) {
      console.log('[Status Migration] [DRY RUN MODE] Starting dry run migration scan...');
    }

    // 1. Fetch records that need migration for dry-run/backup purposes
    const legacyIngredients = await Ingredient.find({ status: { $in: ['approved', 'reserved', 'claimed', 'handed_over'] } });
    const legacyReservations = await Reservation.find({ deliveryStatus: { $in: ['pending', 'picked_up', 'delivered'] } });
    const legacyRequests = await Request.find({ status: { $in: ['reserved', 'fulfilled'] } });

    const plaintextReservations = await Reservation.find({
      pickupCode: { $exists: true, $ne: '' }
    });

    const isHex64Regex = /^[0-9a-fA-F]{64}$/;
    const reservationsToHash = plaintextReservations.filter(res => !isHex64Regex.test(res.pickupCode));

    // 2. Perform backup if not dry-run
    if (!isDryRun && (legacyIngredients.length > 0 || legacyReservations.length > 0 || legacyRequests.length > 0 || reservationsToHash.length > 0)) {
      const backupData = {
        timestamp: new Date().toISOString(),
        ingredients: legacyIngredients,
        reservations: legacyReservations.concat(reservationsToHash),
        requests: legacyRequests
      };
      const backupDir = path.join(__dirname, '..', 'scratch');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const backupFilePath = path.join(backupDir, `migration_backup_${Date.now()}.json`);
      fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));
      console.log(`[Status Migration] Backup created successfully at ${backupFilePath}`);
    }

    // 3. Status mappings
    if (isDryRun) {
      console.log(`[Status Migration] [DRY RUN] Would map ${legacyIngredients.length} Ingredients to updated statuses.`);
      console.log(`[Status Migration] [DRY RUN] Would map ${legacyReservations.length} Reservations to updated statuses.`);
      console.log(`[Status Migration] [DRY RUN] Would map ${legacyRequests.length} Requests to updated statuses.`);
      console.log(`[Status Migration] [DRY RUN] Would hash ${reservationsToHash.length} plaintext pickup codes and mark them for regeneration.`);
      return;
    }

    // Explicit mappings of legacy statuses
    let modifiedIngCount = 0;
    for (const ing of legacyIngredients) {
      if (ing.status === 'approved' || ing.status === 'reserved' || ing.status === 'claimed' || ing.status === 'handed_over') {
        ing.status = 'available'; // claimed/handed_over are removed from Ingredient model status
        await ing.save();
        modifiedIngCount++;
      }
    }

    let modifiedResCount = 0;
    for (const res of legacyReservations) {
      if (res.deliveryStatus === 'pending') {
        res.deliveryStatus = 'claimed';
      } else if (res.deliveryStatus === 'picked_up') {
        res.deliveryStatus = 'handed_over';
      } else if (res.deliveryStatus === 'delivered') {
        res.deliveryStatus = 'completed';
      }
      await res.save();
      modifiedResCount++;
    }

    let modifiedReqCount = 0;
    for (const req of legacyRequests) {
      if (req.status === 'reserved') {
        req.status = 'claimed';
      } else if (req.status === 'fulfilled') {
        req.status = 'completed';
      }
      await req.save();
      modifiedReqCount++;
    }

    let migratedCodesCount = 0;
    for (const res of reservationsToHash) {
      res.pickupCode = hashPickupCode(res.pickupCode);
      if (res.failedAttempts === undefined || res.failedAttempts === null) {
        res.failedAttempts = 0;
      }
      // Mark code for regeneration by setting codeExpiresAt to the past (Epoch 0)
      res.codeExpiresAt = new Date(0);
      await res.save();
      migratedCodesCount++;
    }

    if (modifiedIngCount > 0 || modifiedResCount > 0 || modifiedReqCount > 0 || migratedCodesCount > 0) {
      console.log(`[Status Migration] Completed. Migrated Ingredients: ${modifiedIngCount}, Reservations: ${modifiedResCount}, Requests: ${modifiedReqCount}. Hashed codes (marked for regen): ${migratedCodesCount}`);
    }
  } catch (err) {
    console.error('[Status Migration Error]', err);
  }
};

module.exports = { runMigration };
