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
    
    await BandwidthSession.updateMany(
      { userId, isActive: true },
      { isActive: false, stoppedAt: new Date() }
    );
    
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
    const session = await BandwidthSession.findOne({ userId, isActive: true });
    
    const dataShared = session ? session.dataShared : 0;
    
    res.json({
      success: true,
      data: {
        amount: dataShared, // MB
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
      // Rate: $0.10 per 100MB = $0.001 per MB (more visible for testing)
      // You can adjust this rate as needed
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
});
