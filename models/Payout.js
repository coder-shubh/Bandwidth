const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true, // USD
  },
  credits: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['paypal', 'crypto', 'bank'],
    required: true,
  },
  paymentDetails: {
    // PayPal email or crypto wallet address
    paypalEmail: String,
    cryptoWallet: String,
    bankAccount: String,
  },
  transactionId: {
    type: String, // PayPal transaction ID or crypto hash
  },
  processedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  errorMessage: {
    type: String,
  },
});

payoutSchema.index({ userId: 1, status: 1 });
payoutSchema.index({ status: 1 });
payoutSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payout', payoutSchema);
