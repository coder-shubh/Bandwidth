const mongoose = require('mongoose');

const statisticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
  },
  amount: {
    type: Number, // MB
    required: true,
    default: 0,
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'daily',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

statisticsSchema.index({ userId: 1, date: 1, period: 1 });
statisticsSchema.index({ userId: 1, period: 1 });

module.exports = mongoose.model('Statistics', statisticsSchema);
