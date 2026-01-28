const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  deviceLimit: {
    type: Number,
    default: 10,
    min: 1,
    max: 50,
  },
  bandwidthLimit: {
    type: Number,
    default: 50, // GB
    min: 1,
    max: 1000,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

settingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

settingsSchema.index({ userId: 1 });

module.exports = mongoose.model('Settings', settingsSchema);
