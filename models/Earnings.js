const mongoose = require('mongoose');

const earningsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  today: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    default: 0,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

earningsSchema.index({ userId: 1 });

module.exports = mongoose.model('Earnings', earningsSchema);
