const mongoose = require('mongoose');

const qualityReportSchema = new mongoose.Schema({
  ingredientRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ingredient',
    required: true
  },
  packagingIntact: {
    type: Boolean,
    required: true
  },
  expiryValid: {
    type: Boolean,
    required: true
  },
  noFoulSmell: {
    type: Boolean,
    required: true
  },
  properStorage: {
    type: Boolean,
    required: true
  },
  noLeakage: {
    type: Boolean,
    required: true
  },
  quantityVerified: {
    type: Boolean,
    required: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  verifiedAt: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('QualityReport', qualityReportSchema);
