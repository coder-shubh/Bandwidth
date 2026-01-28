/**
 * Script to create a partner account
 * Usage: node scripts/createPartner.js <name> <email> <tier>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const Partner = require('../models/Partner');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Cluster19986:ZkdESnJWXWF4@cluster19986.4ktj0.mongodb.net/bandwidthshare?retryWrites=true&w=majority&appName=BandwidthShare';

const createPartner = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const name = process.argv[2] || 'Test Partner';
    const email = process.argv[3] || `partner${Date.now()}@example.com`;
    const tier = process.argv[4] || 'tier1';

    // Pricing tiers
    const pricing = {
      tier1: { pricePerGB: 0.10, name: 'Basic' },
      tier2: { pricePerGB: 0.20, name: 'Premium' },
      tier3: { pricePerGB: 0.30, name: 'Enterprise' },
    };

    // Generate API credentials
    const apiKey = crypto.randomBytes(32).toString('hex');
    const apiSecret = crypto.randomBytes(32).toString('hex');

    const partner = new Partner({
      name,
      email,
      apiKey,
      apiSecret,
      pricingTier: tier,
      pricePerGB: pricing[tier].pricePerGB,
      balance: 100, // $100 starting balance
      status: 'active',
    });

    await partner.save();

    console.log('\n✅ Partner created successfully!');
    console.log('\nPartner Details:');
    console.log(`  Name: ${partner.name}`);
    console.log(`  Email: ${partner.email}`);
    console.log(`  Tier: ${pricing[tier].name} ($${pricing[tier].pricePerGB}/GB)`);
    console.log(`  Balance: $${partner.balance}`);
    console.log(`  API Key: ${partner.apiKey}`);
    console.log(`  API Secret: ${partner.apiSecret}`);
    console.log('\n⚠️  Save these credentials securely!');
    console.log('\nExample API request:');
    console.log(`curl -X POST http://localhost:3000/api/partner/request \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -H "x-api-key: ${partner.apiKey}" \\`);
    console.log(`  -H "x-api-secret: ${partner.apiSecret}" \\`);
    console.log(`  -d '{"targetUrl": "https://api.example.com/data"}'`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createPartner();
