const mongoose = require('mongoose');

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
