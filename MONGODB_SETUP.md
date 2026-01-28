# MongoDB Integration Guide

## ✅ What Was Implemented

### 1. MongoDB Models Created
All models are in the `models/` directory:

- **User.js** - User authentication and profile
- **Earnings.js** - User earnings (today and total)
- **Settings.js** - User settings (device limit, bandwidth limit)
- **Statistics.js** - Bandwidth usage statistics (daily/weekly/monthly)
- **BandwidthSession.js** - Active bandwidth sharing sessions

### 2. Database Connection
- MongoDB connection using Mongoose
- Connection string stored in `.env` file
- Automatic reconnection on connection loss
- Database name: `bandwidthshare`

### 3. Updated Server Routes
All routes now use MongoDB instead of in-memory storage:
- ✅ Authentication (signup/login) - Uses User model
- ✅ Earnings - Uses Earnings model
- ✅ Statistics - Uses Statistics model
- ✅ Settings - Uses Settings model
- ✅ Bandwidth Sessions - Uses BandwidthSession model

---

## 🚀 Setup Instructions

### Step 1: Install Dependencies
```bash
cd "Bandwidth backend"
npm install
```

This will install:
- `mongoose` - MongoDB ODM
- All other existing dependencies

### Step 2: Configure Environment Variables
The `.env` file has been created with your MongoDB connection string:

```env
PORT=3000
JWT_SECRET=your-super-secret-key-change-this-in-production
MONGODB_URI=mongodb+srv://Cluster19986:ZkdESnJWXWF4@cluster19986.4ktj0.mongodb.net/bandwidthshare?retryWrites=true&w=majority
```

**Important**: 
- The database name is `bandwidthshare`
- MongoDB Atlas will automatically create the database on first connection
- Make sure your MongoDB Atlas IP whitelist includes your server IP (or use 0.0.0.0/0 for development)

### Step 3: Start the Server
```bash
npm start
# or for development with auto-reload:
npm run dev
```

You should see:
```
✅ Connected to MongoDB
🚀 Backend server running on http://localhost:3000
📡 API available at http://localhost:3000/api
📦 Database: Connected
```

---

## 📊 Database Schema

### Collections Created:

1. **users**
   - `email` (String, unique, required)
   - `password` (String, hashed)
   - `name` (String)
   - `createdAt`, `updatedAt` (Date)

2. **earnings**
   - `userId` (ObjectId, ref: User, unique)
   - `today` (Number, default: 0)
   - `total` (Number, default: 0)
   - `lastUpdated` (Date)

3. **settings**
   - `userId` (ObjectId, ref: User, unique)
   - `deviceLimit` (Number, default: 10)
   - `bandwidthLimit` (Number, default: 50)
   - `updatedAt` (Date)

4. **statistics**
   - `userId` (ObjectId, ref: User)
   - `date` (String, format: YYYY-MM-DD)
   - `amount` (Number, in MB)
   - `period` (String: 'daily', 'weekly', 'monthly')
   - `createdAt` (Date)

5. **bandwidthsessions**
   - `userId` (ObjectId, ref: User)
   - `startedAt` (Date)
   - `stoppedAt` (Date, optional)
   - `dataShared` (Number, in MB)
   - `isActive` (Boolean)
   - `lastUpdated` (Date)

---

## 🔍 Features

### Automatic Data Initialization
- When a user signs up or logs in, default data is automatically created:
  - Earnings record (today: 0, total: 0)
  - Settings record (deviceLimit: 10, bandwidthLimit: 50)
  - Sample statistics data (7 days daily, 4 weeks weekly, 12 months monthly)

### Data Persistence
- All data is now persisted in MongoDB
- Data survives server restarts
- Multiple server instances can share the same database

### Indexes
- Indexes created on frequently queried fields:
  - `userId` indexes for fast lookups
  - Composite indexes for statistics queries
  - Unique indexes to prevent duplicates

---

## 🧪 Testing

### Test Database Connection
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "database": "connected"
}
```

### Test User Signup
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "name": "Test User"
  }'
```

### Test User Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'
```

---

## 🔒 Security Notes

1. **MongoDB Atlas Security**:
   - Your connection string includes credentials
   - Make sure `.env` is in `.gitignore` (already done)
   - Never commit `.env` to version control

2. **Password Hashing**:
   - Passwords are hashed using bcrypt
   - Never stored in plain text

3. **JWT Tokens**:
   - Tokens expire after 7 days
   - Secret key should be changed in production

4. **Database Access**:
   - MongoDB Atlas network access should be restricted
   - Use IP whitelist or VPC peering for production

---

## 📝 Migration from In-Memory to MongoDB

### What Changed:
- ✅ All in-memory Maps removed
- ✅ All routes now use MongoDB models
- ✅ Data persists across server restarts
- ✅ Multiple users can use the app simultaneously
- ✅ Data is properly structured and indexed

### Backward Compatibility:
- API endpoints remain the same
- Response formats are unchanged
- No changes needed in the React Native app

---

## 🐛 Troubleshooting

### Issue: "MongoServerError: Authentication failed"
**Solution**:
- Check MongoDB username and password in connection string
- Verify MongoDB Atlas user has proper permissions
- Check if IP address is whitelisted in MongoDB Atlas

### Issue: "MongooseError: Operation `users.findOne()` buffering timed out"
**Solution**:
- Check internet connection
- Verify MongoDB Atlas cluster is running
- Check connection string format
- Verify network access in MongoDB Atlas

### Issue: "MongoServerError: bad auth"
**Solution**:
- Verify username and password are correct
- Check if special characters in password are URL-encoded
- Try resetting MongoDB Atlas user password

### Issue: Database not created
**Solution**:
- MongoDB Atlas creates databases automatically on first write
- Make sure connection string includes database name: `/bandwidthshare`
- Try creating a user or making an API call

---

## 📈 Next Steps (Optional Enhancements)

1. **Add Database Migrations**
   - Use migration tool for schema changes
   - Version control for database structure

2. **Add Data Validation**
   - More strict validation rules
   - Custom validators for business logic

3. **Add Database Indexes**
   - Additional indexes for performance
   - Compound indexes for complex queries

4. **Add Data Backup**
   - Automated backups
   - Point-in-time recovery

5. **Add Monitoring**
   - Database performance monitoring
   - Query optimization
   - Connection pool monitoring

---

## ✅ Implementation Complete!

Your backend now uses MongoDB for persistent data storage. All data will be saved to your MongoDB Atlas cluster and persist across server restarts.

**Database**: `bandwidthshare`  
**Connection**: MongoDB Atlas Cluster  
**Status**: Ready to use! 🎉
