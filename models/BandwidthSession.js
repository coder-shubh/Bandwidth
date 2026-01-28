const mongoose = require('mongoose');

const bandwidthSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  stoppedAt: {
    type: Date,
  },
  dataShared: {
    type: Number, // MB
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

bandwidthSessionSchema.index({ userId: 1, isActive: 1 });
bandwidthSessionSchema.index({ userId: 1 });

module.exports = mongoose.model('BandwidthSession', bandwidthSessionSchema);
