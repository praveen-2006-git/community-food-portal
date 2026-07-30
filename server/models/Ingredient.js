const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  expiryDate: {
    type: Date,
    required: true,
    immutable: true
  },
  pickupDeadline: {
    type: Date,
    required: true,
    immutable: true
  },
  storageType: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'reserved', 'expired'],
    default: 'pending',
    required: true
  },
  donorRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    }
  },
  donorDeclaration: {
    type: Boolean,
    required: true
  },
  locationGeo: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: [Number] // [longitude, latitude]
  }
}, {
  timestamps: true
});

// Index locationGeo with 2dsphere for geospatial proximity queries
ingredientSchema.index({ locationGeo: '2dsphere' });

// Keep locationGeo Point in sync with location modifications
ingredientSchema.pre('save', async function () {
  if (this.location && (this.isModified('location') || this.isNew)) {
    if (typeof this.location.lat === 'number' && typeof this.location.lng === 'number') {
      this.locationGeo = {
        type: 'Point',
        coordinates: [this.location.lng, this.location.lat]
      };
    } else {
      this.locationGeo = undefined;
    }
  } else if (!this.location) {
    this.locationGeo = undefined;
  }
});

module.exports = mongoose.model('Ingredient', ingredientSchema);
