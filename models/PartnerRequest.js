const mongoose = require('mongoose');

const partnerRequestSchema = new mongoose.Schema({
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  targetUrl: {
    type: String,
    required: true,
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE'],
    default: 'GET',
  },
  headers: {
    type: Map,
    of: String,
  },
  body: {
    type: String, // JSON string
  },
  responseStatus: {
    type: Number,
  },
  responseSize: {
    type: Number, // bytes
    default: 0,
  },
  dataUsedMB: {
    type: Number,
    default: 0,
  },
  cost: {
    type: Number, // USD
    default: 0,
  },
  userEarnings: {
    type: Number, // USD (70% of cost)
    default: 0,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

partnerRequestSchema.index({ partnerId: 1, timestamp: -1 });
partnerRequestSchema.index({ userId: 1, timestamp: -1 });
partnerRequestSchema.index({ timestamp: -1 });

module.exports = mongoose.model('PartnerRequest', partnerRequestSchema);
