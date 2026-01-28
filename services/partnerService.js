/**
 * Partner Service
 * Handles partner API requests and routing
 */

const axios = require('axios');
const Partner = require('../models/Partner');
const PartnerRequest = require('../models/PartnerRequest');
const BandwidthSession = require('../models/BandwidthSession');
const Earnings = require('../models/Earnings');
const mongoose = require('mongoose');
const proxyService = require('./proxyService');

// Platform fee: 30%, User share: 70%
const PLATFORM_FEE = 0.30;
const USER_SHARE = 0.70;

/**
 * Verify partner API key
 */
const verifyPartnerApiKey = async (apiKey, apiSecret) => {
  const partner = await Partner.findOne({ apiKey, apiSecret, status: 'active' });
  return partner;
};

/**
 * Route partner request through user's IP
 * This simulates routing - in production, this would route through VPN/proxy
 */
const routePartnerRequest = async (partnerId, userId, requestData) => {
  try {
    const partner = await Partner.findById(partnerId);
    if (!partner || partner.status !== 'active') {
      throw new Error('Partner not found or inactive');
    }

    // Check if user has active sharing session
    const session = await BandwidthSession.findOne({ userId, isActive: true });
    if (!session) {
      throw new Error('User not actively sharing bandwidth');
    }

    // Check partner balance
    if (partner.balance <= 0) {
      throw new Error('Partner has insufficient balance');
    }

    // Route request through user's IP (via VPN/proxy)
    // This makes the request appear to come from user's residential IP
    const response = await proxyService.routeThroughUserIP(userId, requestData, partnerId);

    // Calculate data used
    const dataUsedMB = proxyService.calculateDataUsage(requestData, response.data);

    // Calculate cost based on partner's pricing tier
    const dataUsedGB = dataUsedMB / 1024;
    const cost = dataUsedGB * partner.pricePerGB;

    // Check if partner has enough balance
    if (cost > partner.balance) {
      throw new Error('Partner has insufficient balance for this request');
    }

    // Calculate user earnings (70% of cost)
    const userEarnings = cost * USER_SHARE;

    // Deduct from partner balance
    partner.balance -= cost;
    partner.totalUsageGB += dataUsedGB;
    partner.totalSpent += cost;
    await partner.save();

    // Update user earnings
    let earnings = await Earnings.findOne({ userId });
    if (!earnings) {
      earnings = new Earnings({ userId, today: 0, total: 0 });
    }
    
    // Add to today's earnings
    const todayEarnings = (earnings.today || 0) + userEarnings;
    earnings.today = todayEarnings;
    earnings.total = (earnings.total || 0) + userEarnings;
    earnings.lastUpdated = new Date();
    await earnings.save();

    // Update session data shared
    session.dataShared = (session.dataShared || 0) + dataUsedMB;
    session.lastUpdated = new Date();
    await session.save();

    // Log the request
    const partnerRequest = new PartnerRequest({
      partnerId,
      userId,
      targetUrl: requestData.targetUrl,
      method: requestData.method || 'GET',
      headers: requestData.headers || {},
      body: requestData.body,
      responseStatus: response.status,
      responseSize: responseSize,
      dataUsedMB,
      cost,
      userEarnings,
    });
    await partnerRequest.save();

    return {
      success: true,
      data: response.data,
      status: response.status,
      dataUsedMB: dataUsedMB.toFixed(4),
      cost: cost.toFixed(4),
      userEarnings: userEarnings.toFixed(4),
    };
  } catch (error) {
    console.error('Partner request routing error:', error);
    throw error;
  }
};

/**
 * Get available users for routing
 */
const getAvailableUsers = async (minDataAvailableMB = 100) => {
  const sessions = await BandwidthSession.find({
    isActive: true,
    $expr: {
      $gte: [
        { $subtract: [{ $multiply: ['$bandwidthLimit', 1024] }, '$dataShared'] },
        minDataAvailableMB,
      ],
    },
  })
    .populate('userId', 'email')
    .limit(100)
    .lean();

  return sessions.map(session => ({
    userId: session.userId._id,
    email: session.userId.email,
    dataAvailableMB: (session.bandwidthLimit * 1024) - (session.dataShared || 0),
  }));
};

/**
 * Get partner statistics
 */
const getPartnerStats = async (partnerId, startDate, endDate) => {
  const match = {
    partnerId: mongoose.Types.ObjectId(partnerId),
    timestamp: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };

  const stats = await PartnerRequest.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        totalDataMB: { $sum: '$dataUsedMB' },
        totalCost: { $sum: '$cost' },
        totalUserEarnings: { $sum: '$userEarnings' },
      },
    },
  ]);

  return stats[0] || {
    totalRequests: 0,
    totalDataMB: 0,
    totalCost: 0,
    totalUserEarnings: 0,
  };
};

module.exports = {
  verifyPartnerApiKey,
  routePartnerRequest,
  getAvailableUsers,
  getPartnerStats,
};
