/**
 * Backend Server for BandwidthShare App
 * Express server with MongoDB database
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// Import models
const User = require('./models/User');
const Earnings = require('./models/Earnings');
const Settings = require('./models/Settings');
const Statistics = require('./models/Statistics');
const BandwidthSession = require('./models/BandwidthSession');
const Partner = require('./models/Partner');
const Payout = require('./models/Payout');
const PartnerRequest = require('./models/PartnerRequest');

// Import services
const paymentService = require('./services/paymentService');
const partnerService = require('./services/partnerService');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Cluster19986:ZkdESnJWXWF4@cluster19986.4ktj0.mongodb.net/bandwidthshare?retryWrites=true&w=majority&appName=BandwidthShare';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Helper function to generate JWT token
const generateToken = (userId, email) => {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
};

// Helper function to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Convert userId to ObjectId if it's a string
    req.userId = mongoose.Types.ObjectId.isValid(decoded.userId) 
      ? new mongoose.Types.ObjectId(decoded.userId) 
      : decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// Initialize user data (create default records if they don't exist)
const initializeUserData = async (userId) => {
  try {
    // Initialize Earnings
    let earnings = await Earnings.findOne({ userId });
    if (!earnings) {
      earnings = new Earnings({
        userId,
        today: 0,
        total: 0,
      });
      await earnings.save();
    }

    // Initialize Settings
    let settings = await Settings.findOne({ userId });
    if (!settings) {
      settings = new Settings({
        userId,
        deviceLimit: 10,
        bandwidthLimit: 50,
      });
      await settings.save();
    }

    // Initialize Statistics with sample data if empty
    const statsCount = await Statistics.countDocuments({ userId });
    if (statsCount === 0) {
      const generateData = (days, period) => {
        const stats = [];
        for (let i = 0; i < days; i++) {
          const date = new Date();
          date.setDate(date.getDate() - (days - i - 1));
          stats.push({
            userId,
            date: date.toISOString().split('T')[0],
            amount: Math.floor(Math.random() * 500) + 100, // MB
            period,
          });
        }
        return stats;
      };

      const dailyStats = generateData(7, 'daily');
      const weeklyStats = generateData(4, 'weekly');
      const monthlyStats = generateData(12, 'monthly');

      await Statistics.insertMany([...dailyStats, ...weeklyStats, ...monthlyStats]);
    }
  } catch (error) {
    console.error('Error initializing user data:', error);
  }
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Authentication Routes

// Sign Up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const newUser = new User({
      email: email.toLowerCase(),
      name: name || '',
      password: hashedPassword,
    });
    
    await newUser.save();
    
    // Initialize user data
    await initializeUserData(newUser._id);
    
    // Generate token
    const token = generateToken(newUser._id.toString(), newUser.email);
    
    res.json({
      success: true,
      data: {
        user: { email: newUser.email, name: newUser.name },
        token,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    // Initialize user data if needed
    await initializeUserData(user._id);
    
    // Generate token
    const token = generateToken(user._id.toString(), user.email);
    
    res.json({
      success: true,
      data: {
        user: { email: user.email, name: user.name },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Logout
app.post('/api/auth/logout', verifyToken, (req, res) => {
  // In a real app, you might want to blacklist the token
  res.json({ success: true });
});

// Earnings Routes

// Get earnings
app.get('/api/earnings', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    let earnings = await Earnings.findOne({ userId });
    
    if (!earnings) {
      // Create default earnings if doesn't exist
      earnings = new Earnings({
        userId,
        today: 0,
        total: 0,
      });
      await earnings.save();
    }
    
    const todayEarnings = earnings.today || 0;
    const totalEarnings = earnings.total || 0;
    
    console.log(`Returning earnings for user ${userId}: Today: $${todayEarnings.toFixed(4)}, Total: $${totalEarnings.toFixed(4)}`);
    
    res.json({
      success: true,
      data: {
        today: todayEarnings,
        total: totalEarnings,
      },
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update earnings (for testing/admin)
app.put('/api/earnings', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { today, total } = req.body;
    
    let earnings = await Earnings.findOne({ userId });
    
    if (!earnings) {
      earnings = new Earnings({ userId, today: 0, total: 0 });
    }
    
    if (today !== undefined) earnings.today = today;
    if (total !== undefined) earnings.total = total;
    earnings.lastUpdated = new Date();
    
    await earnings.save();
    
    res.json({
      success: true,
      data: {
        today: earnings.today,
        total: earnings.total,
      },
    });
  } catch (error) {
    console.error('Update earnings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Statistics Routes

// Get statistics
app.get('/api/statistics', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const period = req.query.period || 'daily';
    
    const stats = await Statistics.find({ userId, period })
      .sort({ date: 1 })
      .select('date amount')
      .lean();
    
    // If no stats found, return empty array (not null)
    const statsArray = stats || [];
    
    console.log(`Returning ${statsArray.length} ${period} statistics for user ${userId}`);
    
    res.json({
      success: true,
      data: {
        [period]: statsArray,
      },
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Settings Routes

// Get settings
app.get('/api/settings', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    let settings = await Settings.findOne({ userId });
    
    if (!settings) {
      settings = new Settings({
        userId,
        deviceLimit: 10,
        bandwidthLimit: 50,
      });
      await settings.save();
    }
    
    res.json({
      success: true,
      data: {
        deviceLimit: settings.deviceLimit,
        bandwidthLimit: settings.bandwidthLimit,
      },
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update settings
app.put('/api/settings', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { deviceLimit, bandwidthLimit } = req.body;
    
    let settings = await Settings.findOne({ userId });
    
    if (!settings) {
      settings = new Settings({ userId });
    }
    
    if (deviceLimit !== undefined) settings.deviceLimit = deviceLimit;
    if (bandwidthLimit !== undefined) settings.bandwidthLimit = bandwidthLimit;
    
    await settings.save();
    
    res.json({
      success: true,
      data: {
        deviceLimit: settings.deviceLimit,
        bandwidthLimit: settings.bandwidthLimit,
      },
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bandwidth Routes

// Start bandwidth sharing
app.post('/api/bandwidth/start', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Stop any existing active session
    await BandwidthSession.updateMany(
      { userId, isActive: true },
      { isActive: false, stoppedAt: new Date() }
    );
    
    // Create new session
    const session = new BandwidthSession({
      userId,
      startedAt: new Date(),
      dataShared: 0,
      isActive: true,
    });
    
    await session.save();
    
    res.json({
      success: true,
      data: {
        status: 'connected',
      },
    });
  } catch (error) {
    console.error('Start bandwidth error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stop bandwidth sharing
app.post('/api/bandwidth/stop', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get active session before stopping
    const activeSession = await BandwidthSession.findOne({ userId, isActive: true });
    
    // Update all active sessions to inactive
    await BandwidthSession.updateMany(
      { userId, isActive: true },
      { isActive: false, stoppedAt: new Date() }
    );
    
    // If there was an active session, ensure its data is persisted
    if (activeSession) {
      // Update statistics for today with final data
      const today = new Date().toISOString().split('T')[0];
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const tomorrow = new Date(todayStart);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Calculate total data shared today
      const sessionsToday = await BandwidthSession.find({
        userId,
        startedAt: { $gte: todayStart, $lt: tomorrow }
      });
      
      const totalDataToday = sessionsToday.reduce((total, session) => {
        return total + (session.dataShared || 0);
      }, 0);
      
      // Update statistics
      await Statistics.findOneAndUpdate(
        { userId, date: today, period: 'daily' },
        { amount: totalDataToday, $setOnInsert: { userId, date: today, period: 'daily' } },
        { upsert: true, new: true }
      );
      
      console.log(`Stopped sharing for user ${userId}. Total data today: ${totalDataToday} MB`);
    }
    
    res.json({
      success: true,
      data: {
        status: 'disconnected',
      },
    });
  } catch (error) {
    console.error('Stop bandwidth error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get data shared today
app.get('/api/bandwidth/data-shared', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get today's date range (start of day to end of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Sum all data shared today (both active and inactive sessions)
    const sessionsToday = await BandwidthSession.find({
      userId,
      startedAt: { $gte: today, $lt: tomorrow }
    });
    
    // Calculate total data shared today
    const dataShared = sessionsToday.reduce((total, session) => {
      return total + (session.dataShared || 0);
    }, 0);
    
    // Also check active session for real-time data
    const activeSession = await BandwidthSession.findOne({ userId, isActive: true });
    const activeData = activeSession ? activeSession.dataShared : 0;
    
    // Return the maximum (in case active session has more recent data)
    const totalDataShared = Math.max(dataShared, activeData);
    
    res.json({
      success: true,
      data: {
        amount: totalDataShared, // MB
      },
    });
  } catch (error) {
    console.error('Get data shared error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update data shared (called periodically by client)
app.post('/api/bandwidth/update-data', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { amount } = req.body; // MB
    
    const session = await BandwidthSession.findOne({ userId, isActive: true });
    
    if (session) {
      session.dataShared = amount;
      session.lastUpdated = new Date();
      await session.save();
      
      // Update earnings based on data shared
      // Note: Real earnings come from partner requests (see partnerService)
      // This is fallback for monitoring-only mode
      // Rate: $0.10 per 100MB = $0.001 per MB (for testing/demo)
      const earningsPerMB = 0.001; // $0.001 per MB = $0.10 per 100MB
      const newEarnings = amount * earningsPerMB;
      
      let earnings = await Earnings.findOne({ userId });
      if (!earnings) {
        earnings = new Earnings({ userId, today: 0, total: 0 });
      }
      
      // Only update if new earnings is greater (to handle multiple updates)
      // Calculate incremental earnings based on difference
      const previousToday = earnings.today || 0;
      const incrementalEarnings = newEarnings - previousToday;
      
      if (incrementalEarnings > 0) {
        earnings.today = newEarnings;
        earnings.total = (earnings.total || 0) + incrementalEarnings;
        earnings.lastUpdated = new Date();
        await earnings.save();
        console.log(`Updated earnings for user ${userId}: Today: $${earnings.today.toFixed(4)}, Total: $${earnings.total.toFixed(4)}`);
      }
      
      // Update statistics for today
      const today = new Date().toISOString().split('T')[0];
      await Statistics.findOneAndUpdate(
        { userId, date: today, period: 'daily' },
        { amount, $setOnInsert: { userId, date: today, period: 'daily' } },
        { upsert: true, new: true }
      );
    }
    
    res.json({
      success: true,
    });
  } catch (error) {
    console.error('Update data shared error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`📦 Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  POST   /api/auth/signup`);
  console.log(`  POST   /api/auth/login`);
  console.log(`  POST   /api/auth/logout`);
  console.log(`  GET    /api/earnings`);
  console.log(`  GET    /api/statistics?period=daily|weekly|monthly`);
  console.log(`  GET    /api/settings`);
  console.log(`  PUT    /api/settings`);
  console.log(`  POST   /api/bandwidth/start`);
  console.log(`  POST   /api/bandwidth/stop`);
  console.log(`  GET    /api/bandwidth/data-shared`);
  console.log(`  POST   /api/bandwidth/update-data`);
  console.log(`\nPartner API endpoints:`);
  console.log(`  POST   /api/partner/request`);
  console.log(`  GET    /api/partner/stats`);
  console.log(`\nPayment endpoints:`);
  console.log(`  POST   /api/payout/request`);
  console.log(`  GET    /api/payout/eligibility`);
  console.log(`  GET    /api/payout/history`);
});

// Partner API Routes (for companies using the network)

// Verify partner API key middleware
const verifyPartnerApi = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const apiSecret = req.headers['x-api-secret'];
  
  if (!apiKey || !apiSecret) {
    return res.status(401).json({ success: false, error: 'API key and secret required' });
  }
  
  const partner = await partnerService.verifyPartnerApiKey(apiKey, apiSecret);
  if (!partner) {
    return res.status(401).json({ success: false, error: 'Invalid API credentials' });
  }
  
  req.partner = partner;
  next();
};

// Partner request endpoint (companies use this to route requests through user IPs)
app.post('/api/partner/request', verifyPartnerApi, async (req, res) => {
  try {
    const { targetUrl, method, headers, body, userId } = req.body;
    const partner = req.partner;
    
    if (!targetUrl) {
      return res.status(400).json({ success: false, error: 'targetUrl is required' });
    }
    
    // If userId not provided, get an available user
    let targetUserId = userId;
    if (!targetUserId) {
      const availableUsers = await partnerService.getAvailableUsers();
      if (availableUsers.length === 0) {
        return res.status(503).json({ success: false, error: 'No users available for routing' });
      }
      // Select random user (in production, use load balancing)
      targetUserId = availableUsers[Math.floor(Math.random() * availableUsers.length)].userId;
    }
    
    const result = await partnerService.routePartnerRequest(
      partner._id,
      targetUserId,
      { targetUrl, method, headers, body }
    );
    
    res.json({
      success: true,
      data: result.data,
      status: result.status,
      metadata: {
        dataUsedMB: result.dataUsedMB,
        cost: result.cost,
        userEarnings: result.userEarnings,
      },
    });
  } catch (error) {
    console.error('Partner request error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Partner statistics endpoint
app.get('/api/partner/stats', verifyPartnerApi, async (req, res) => {
  try {
    const partner = req.partner;
    const startDate = req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    const endDate = req.query.endDate || new Date();
    
    const stats = await partnerService.getPartnerStats(partner._id, startDate, endDate);
    
    res.json({
      success: true,
      data: {
        partner: {
          name: partner.name,
          balance: partner.balance,
          totalUsageGB: partner.totalUsageGB,
          totalSpent: partner.totalSpent,
        },
        period: {
          startDate,
          endDate,
        },
        statistics: stats,
      },
    });
  } catch (error) {
    console.error('Partner stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Payment/Payout Routes (for users)

// Request payout
app.post('/api/payout/request', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { amount, paymentMethod, paymentDetails } = req.body;
    
    // Check eligibility
    const eligibility = await paymentService.checkPayoutEligibility(userId);
    if (!eligibility.eligible) {
      return res.status(400).json({
        success: false,
        error: eligibility.message,
      });
    }
    
    // Validate amount
    if (amount < 5 || amount > eligibility.amount) {
      return res.status(400).json({
        success: false,
        error: `Amount must be between $5 and $${eligibility.amount.toFixed(2)}`,
      });
    }
    
    // Validate payment details
    if (paymentMethod === 'paypal' && !paymentDetails.paypalEmail) {
      return res.status(400).json({
        success: false,
        error: 'PayPal email is required',
      });
    }
    
    // Process payout
    const result = await paymentService.processUserPayout(
      userId,
      amount,
      paymentMethod,
      paymentDetails
    );
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          payoutId: result.payoutId,
          transactionId: result.transactionId,
          amount,
          status: 'processing',
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Payout request error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check payout eligibility
app.get('/api/payout/eligibility', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const eligibility = await paymentService.checkPayoutEligibility(userId);
    
    res.json({
      success: true,
      data: eligibility,
    });
  } catch (error) {
    console.error('Payout eligibility error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get payout history
app.get('/api/payout/history', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 10;
    const history = await paymentService.getPayoutHistory(userId, limit);
    
    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Payout history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
