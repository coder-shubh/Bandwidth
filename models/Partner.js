const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  apiKey: {
    type: String,
    required: true,
    unique: true,
  },
  apiSecret: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  },
  pricingTier: {
    type: String,
    enum: ['tier1', 'tier2', 'tier3'],
    default: 'tier1',
  },
  // Pricing: $0.10/GB (tier1), $0.20/GB (tier2), $0.30/GB (tier3)
  pricePerGB: {
    type: Number,
    default: 0.10, // $0.10 per GB
  },
  totalUsageGB: {
    type: Number,
    default: 0,
  },
  totalSpent: {
    type: Number,
    default: 0, // USD
  },
  balance: {
    type: Number,
    default: 0, // USD (prepaid balance)
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

partnerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

partnerSchema.index({ apiKey: 1 });
partnerSchema.index({ status: 1 });

module.exports = mongoose.model('Partner', partnerSchema);
