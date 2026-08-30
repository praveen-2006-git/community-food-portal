const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  adminRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['approve_ingredient', 'reject_ingredient', 'reactivate_donor', 'deactivate_donor', 'resolve_dispute']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  details: {
    type: String,
    trim: true,
    default: ''
  },
  actorIP: {
    type: String,
    default: ''
  },
  actorUserAgent: {
    type: String,
    default: ''
  },
  actorEmail: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
