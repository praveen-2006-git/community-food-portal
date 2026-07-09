const mongoose = require('mongoose');

const issueReportSchema = new mongoose.Schema({
  reservationRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    required: true
  },
  ingredientRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ingredient',
    required: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  proofDescription: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'upheld', 'dismissed'],
    default: 'pending',
    required: true
  },
  reputationDeducted: {
    type: Boolean,
    default: false,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('IssueReport', issueReportSchema);
