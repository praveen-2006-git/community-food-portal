const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  minThreshold: {
    type: Number,
    required: true,
    default: 5
  },
  expiryDate: {
    type: Date
  }
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['donor', 'soup_kitchen', 'admin'],
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
  reputationScore: {
    type: Number,
    default: 100 // Used primarily for donors
  },
  storageCapabilities: {
    type: [String],
    enum: ['ambient', 'chilled', 'frozen'],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  },
  locationGeo: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: [Number] // [longitude, latitude]
  },
  // Operational fields for Donors
  contactPerson: {
    type: String,
    required: function() { return this.role === 'donor'; }
  },
  authorityToDonate: {
    type: Boolean,
    required: function() { return this.role === 'donor'; },
    validate: {
      validator: function(v) {
        if (this.role === 'donor') return v === true;
        return true;
      },
      message: 'Donors must confirm authority to donate.'
    }
  },
  venueCategory: {
    type: String,
    enum: [
      'HOTEL',
      'MANDAPAM',
      'MARRIAGE_HALL',
      'CONVENTION_CENTRE',
      'COMMUNITY_HALL',
      'RELIGIOUS_HALL',
      'CATERER',
      'RESTAURANT',
      'BANQUET_HALL',
      'FOOD_SUPPLIER',
      'SUPERMARKET',
      'OTHER'
    ],
    default: 'OTHER'
  },
  typicalDonationSchedule: {
    type: [String],
    default: []
  },
  preferredPickupWindow: {
    type: String,
    default: ''
  },
  typicalIngredientCategories: {
    type: [String],
    default: []
  },
  // Inventory tracking for Kitchens
  inventory: {
    type: [inventoryItemSchema],
    default: []
  }
}, {
  timestamps: true
});

// Index locationGeo with 2dsphere for geospatial proximity queries
userSchema.index({ locationGeo: '2dsphere' });

// Keep locationGeo Point in sync with location modifications
userSchema.pre('save', async function () {
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

module.exports = mongoose.model('User', userSchema);
