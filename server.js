/**
 * Backend Server for BandwidthShare App
 * Simple Express server with mock data
 * TODO: Connect to real database
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// In-memory storage (replace with database)
const users = [];
const userEarnings = new Map(); // userId -> earnings
const userSettings = new Map(); // userId -> settings
const userStatistics = new Map(); // userId -> statistics
const bandwidthSessions = new Map(); // userId -> session data

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
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// Initialize user data
const initializeUserData = (userId) => {
  if (!userEarnings.has(userId)) {
    userEarnings.set(userId, {
      today: 0,
      total: 0,
    });
  }
  
  if (!userSettings.has(userId)) {
    userSettings.set(userId, {
      deviceLimit: 10,
      bandwidthLimit: 50, // GB
    });
  }
  
  if (!userStatistics.has(userId)) {
    const generateData = (days) => {
      return Array.from({ length: days }, (_, i) => ({
        date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: Math.floor(Math.random() * 500) + 100, // MB
      }));
    };
    
    userStatistics.set(userId, {
      daily: generateData(7),
      weekly: generateData(4),
      monthly: generateData(12),
    });
  }
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
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
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const userId = users.length + 1;
    const newUser = {
      id: userId,
      email,
      name: name || '',
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };
    
    users.push(newUser);
    initializeUserData(userId);
    
    // Generate token
    const token = generateToken(userId, email);
    
    res.json({
      success: true,
      data: {
        user: { email, name: name || '' },
        token,
      },
    });
  } catch (error) {
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
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = generateToken(user.id, user.email);
    
    res.json({
      success: true,
      data: {
        user: { email: user.email, name: user.name },
        token,
      },
    });
  } catch (error) {
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
app.get('/api/earnings', verifyToken, (req, res) => {
  const userId = req.userId;
  const earnings = userEarnings.get(userId) || { today: 0, total: 0 };
  
  res.json({
    success: true,
    data: earnings,
  });
});

// Update earnings (for testing/admin)
app.put('/api/earnings', verifyToken, (req, res) => {
  const userId = req.userId;
  const { today, total } = req.body;
  
  const currentEarnings = userEarnings.get(userId) || { today: 0, total: 0 };
  const updatedEarnings = {
    today: today !== undefined ? today : currentEarnings.today,
    total: total !== undefined ? total : currentEarnings.total,
  };
  
  userEarnings.set(userId, updatedEarnings);
  
  res.json({
    success: true,
    data: updatedEarnings,
  });
});

// Statistics Routes

// Get statistics
app.get('/api/statistics', verifyToken, (req, res) => {
  const userId = req.userId;
  const period = req.query.period || 'daily';
  
  const stats = userStatistics.get(userId) || {
    daily: [],
    weekly: [],
    monthly: [],
  };
  
  res.json({
    success: true,
    data: {
      [period]: stats[period] || [],
    },
  });
});

// Settings Routes

// Get settings
app.get('/api/settings', verifyToken, (req, res) => {
  const userId = req.userId;
  const settings = userSettings.get(userId) || {
    deviceLimit: 10,
    bandwidthLimit: 50,
  };
  
  res.json({
    success: true,
    data: settings,
  });
});

// Update settings
app.put('/api/settings', verifyToken, (req, res) => {
  const userId = req.userId;
  const { deviceLimit, bandwidthLimit } = req.body;
  
  const currentSettings = userSettings.get(userId) || {
    deviceLimit: 10,
    bandwidthLimit: 50,
  };
  
  const updatedSettings = {
    deviceLimit: deviceLimit !== undefined ? deviceLimit : currentSettings.deviceLimit,
    bandwidthLimit: bandwidthLimit !== undefined ? bandwidthLimit : currentSettings.bandwidthLimit,
  };
  
  userSettings.set(userId, updatedSettings);
  
  res.json({
    success: true,
  });
});

// Bandwidth Routes

// Start bandwidth sharing
app.post('/api/bandwidth/start', verifyToken, (req, res) => {
  const userId = req.userId;
  
  bandwidthSessions.set(userId, {
    startedAt: new Date().toISOString(),
    dataShared: 0, // MB
    isActive: true,
  });
  
  res.json({
    success: true,
    data: {
      status: 'connected',
    },
  });
});

// Stop bandwidth sharing
app.post('/api/bandwidth/stop', verifyToken, (req, res) => {
  const userId = req.userId;
  
  const session = bandwidthSessions.get(userId);
  if (session) {
    session.isActive = false;
    session.stoppedAt = new Date().toISOString();
  }
  
  res.json({
    success: true,
    data: {
      status: 'disconnected',
    },
  });
});

// Get data shared today
app.get('/api/bandwidth/data-shared', verifyToken, (req, res) => {
  const userId = req.userId;
  const session = bandwidthSessions.get(userId);
  
  const dataShared = session && session.isActive ? session.dataShared : 0;
  
  res.json({
    success: true,
    data: {
      amount: dataShared, // MB
    },
  });
});

// Update data shared (called periodically by client)
app.post('/api/bandwidth/update-data', verifyToken, (req, res) => {
  const userId = req.userId;
  const { amount } = req.body; // MB
  
  const session = bandwidthSessions.get(userId);
  if (session && session.isActive) {
    session.dataShared = amount;
    
    // Update earnings based on data shared (example: $0.01 per 100MB)
    const earningsPerMB = 0.0001;
    const newEarnings = amount * earningsPerMB;
    
    const currentEarnings = userEarnings.get(userId) || { today: 0, total: 0 };
    userEarnings.set(userId, {
      today: newEarnings,
      total: currentEarnings.total + (newEarnings - currentEarnings.today),
    });
  }
  
  res.json({
    success: true,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
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
});
