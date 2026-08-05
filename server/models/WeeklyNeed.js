const mongoose = require('mongoose');

const weeklyNeedSchema = new mongoose.Schema({
  soupKitchenRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ingredientName: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.1
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'urgent'],
    default: 'normal',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WeeklyNeed', weeklyNeedSchema);
