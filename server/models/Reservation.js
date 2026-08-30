const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  requestRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: true
  },
  reservedQuantity: {
    type: Number,
    required: true,
    min: 1
  },
  reservedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'claimed', 'pickup_scheduled', 'handed_over', 'completed', 'expired', 'cancelled'],
    default: 'claimed',
    required: true
  },
  pickupCode: {
    type: String,
    required: true
  },
  failedAttempts: {
    type: Number,
    default: 0
  },
  codeExpiresAt: {
    type: Date
  },
  delayWarningSent: {
    type: Boolean,
    default: false
  },
  pickupConfirmedByDonor: {
    type: Boolean,
    default: false,
    required: true
  },
  receivedQuantity: {
    type: Number
  },
  condition: {
    type: String,
    enum: ['good', 'partial', 'rejected'],
    default: 'good'
  },
  discrepancyLogged: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

reservationSchema.pre('save', function () {
  const { hashPickupCode } = require('../utils/security');
  if (this.isModified('pickupCode') && this.pickupCode && this.pickupCode !== 'used') {
    const isHex64Regex = /^[0-9a-fA-F]{64}$/;
    if (!isHex64Regex.test(this.pickupCode)) {
      this.pickupCode = hashPickupCode(this.pickupCode);
    }
  }
  if (!this.codeExpiresAt) {
    this.codeExpiresAt = this.expiresAt || new Date(Date.now() + 15 * 60 * 1000);
  }
});

module.exports = mongoose.model('Reservation', reservationSchema);
