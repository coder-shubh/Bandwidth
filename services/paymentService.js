/**
 * Payment Service
 * Handles PayPal payments and payouts
 */

const paypal = require('@paypal/checkout-server-sdk');
const mongoose = require('mongoose');
const Partner = require('../models/Partner');
const Payout = require('../models/Payout');
const Earnings = require('../models/Earnings');

// PayPal Configuration
const environment = process.env.PAYPAL_ENV === 'production'
  ? new paypal.core.LiveEnvironment(
      process.env.PAYPAL_CLIENT_ID,
      process.env.PAYPAL_CLIENT_SECRET
    )
  : new paypal.core.SandboxEnvironment(
      process.env.PAYPAL_CLIENT_ID || 'your-client-id',
      process.env.PAYPAL_CLIENT_SECRET || 'your-client-secret'
    );

const client = new paypal.core.PayPalHttpClient(environment);

/**
 * Process payout to user
 */
const processUserPayout = async (userId, amount, paymentMethod, paymentDetails) => {
  try {
    // Convert USD to credits (1 credit = 10 MB, $1 = 1000 credits)
    const credits = amount * 1000;

    // Create payout record
    const payout = new Payout({
      userId,
      amount,
      credits,
      status: 'processing',
      paymentMethod,
      paymentDetails,
    });
    await payout.save();

    if (paymentMethod === 'paypal') {
      // Process PayPal payout
      const request = new paypal.payouts.PayoutsPostRequest();
      request.requestBody({
        sender_batch_header: {
          email_subject: 'BandwidthShare Earnings Payout',
          sender_batch_id: `PAYOUT-${Date.now()}-${userId}`,
        },
        items: [
          {
            recipient_type: 'EMAIL',
            amount: {
              value: amount.toFixed(2),
              currency: 'USD',
            },
            receiver: paymentDetails.paypalEmail,
            note: 'Thank you for sharing your bandwidth!',
            sender_item_id: `PAYOUT-${userId}-${Date.now()}`,
          },
        ],
      });

      const response = await client.execute(request);
      
      if (response.statusCode === 201) {
        payout.status = 'completed';
        payout.transactionId = response.result.batch_header.payout_batch_id;
        payout.processedAt = new Date();
        await payout.save();

        // Deduct from user's earnings
        const earnings = await Earnings.findOne({ userId });
        if (earnings) {
          earnings.total = Math.max(0, (earnings.total || 0) - amount);
          await earnings.save();
        }

        return {
          success: true,
          payoutId: payout._id,
          transactionId: payout.transactionId,
        };
      } else {
        throw new Error('PayPal payout failed');
      }
    } else {
      // For other payment methods (crypto, bank), mark as pending
      payout.status = 'pending';
      await payout.save();
      return {
        success: true,
        payoutId: payout._id,
        message: 'Payout queued for manual processing',
      };
    }
  } catch (error) {
    console.error('Payment processing error:', error);
    
    // Update payout status
    const payout = await Payout.findOne({ userId, status: 'processing' }).sort({ createdAt: -1 });
    if (payout) {
      payout.status = 'failed';
      payout.errorMessage = error.message;
      await payout.save();
    }

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Check if user has minimum payout amount
 */
const checkPayoutEligibility = async (userId) => {
  const MINIMUM_PAYOUT = 5.0; // $5 minimum
  
  const earnings = await Earnings.findOne({ userId });
  if (!earnings) {
    return { eligible: false, amount: 0, message: 'No earnings found' };
  }

  const totalEarnings = earnings.total || 0;
  const pendingPayouts = await Payout.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), status: { $in: ['pending', 'processing'] } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const pendingAmount = pendingPayouts[0]?.total || 0;
  const availableAmount = totalEarnings - pendingAmount;

  return {
    eligible: availableAmount >= MINIMUM_PAYOUT,
    amount: availableAmount,
    minimum: MINIMUM_PAYOUT,
    message: availableAmount >= MINIMUM_PAYOUT
      ? 'Eligible for payout'
      : `Need $${(MINIMUM_PAYOUT - availableAmount).toFixed(2)} more to reach minimum`,
  };
};

/**
 * Get payout history for user
 */
const getPayoutHistory = async (userId, limit = 10) => {
  return await Payout.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

module.exports = {
  processUserPayout,
  checkPayoutEligibility,
  getPayoutHistory,
};
