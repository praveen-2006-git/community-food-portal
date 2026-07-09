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
    enum: ['pending', 'picked_up', 'delivered', 'expired'],
    default: 'pending',
    required: true
  },
  pickupCode: {
    type: String,
    required: true
  },
  pickupConfirmedByDonor: {
    type: Boolean,
    default: false,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Reservation', reservationSchema);
