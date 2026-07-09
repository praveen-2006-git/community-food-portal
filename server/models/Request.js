const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  soupKitchenRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ingredientRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ingredient',
    required: true
  },
  requestedQuantity: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['pending', 'reserved', 'expired', 'fulfilled'],
    default: 'pending',
    required: true
  },
  pickupMode: {
    type: String,
    enum: ['self', 'volunteer'],
    required: true
  },
  volunteerName: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Request', requestSchema);
