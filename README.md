# BandwidthShare Backend API

Simple Express.js backend server for the BandwidthShare mobile app.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Start Server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

### 3. Server will run on:
- **URL:** `http://localhost:3000`
- **API Base:** `http://localhost:3000/api`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Earnings
- `GET /api/earnings` - Get user earnings
- `PUT /api/earnings` - Update earnings (admin/testing)

### Statistics
- `GET /api/statistics?period=daily|weekly|monthly` - Get bandwidth statistics

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update settings

### Bandwidth
- `POST /api/bandwidth/start` - Start bandwidth sharing
- `POST /api/bandwidth/stop` - Stop bandwidth sharing
- `GET /api/bandwidth/data-shared` - Get data shared today
- `POST /api/bandwidth/update-data` - Update data shared (called by client)

## 🔐 Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## 📝 Request/Response Examples

### Sign Up
```json
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}

Response:
{
  "success": true,
  "data": {
    "user": { "email": "user@example.com", "name": "John Doe" },
    "token": "jwt-token-here"
  }
}
```

### Login
```json
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "data": {
    "user": { "email": "user@example.com", "name": "John Doe" },
    "token": "jwt-token-here"
  }
}
```

### Get Earnings
```json
GET /api/earnings
Headers: Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "today": 0.45,
    "total": 12.34
  }
}
```

## 🗄️ Data Storage

Currently uses **in-memory storage** (data is lost on server restart).

### To use a real database:

1. **MongoDB:**
   ```bash
   npm install mongoose
   ```

2. **PostgreSQL:**
   ```bash
   npm install pg
   ```

3. **SQLite:**
   ```bash
   npm install sqlite3
   ```

## 🔧 Configuration

Create a `.env` file:
```env
PORT=3000
JWT_SECRET=your-super-secret-key-change-this-in-production
```

## 🧪 Testing

Test endpoints with:
- **Postman**
- **curl**
- **Thunder Client** (VS Code extension)

Example curl command:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 📦 Next Steps

1. ✅ Basic server setup (done)
2. ⏳ Connect to database
3. ⏳ Add input validation
4. ⏳ Add rate limiting
5. ⏳ Add logging
6. ⏳ Add error handling middleware
7. ⏳ Add API documentation (Swagger)

## 🚨 Important Notes

- **JWT_SECRET:** Change the default secret in production!
- **Password Hashing:** Uses bcryptjs (10 rounds)
- **CORS:** Enabled for all origins (restrict in production)
- **Data Persistence:** Currently in-memory (add database)

## 📚 Dependencies

- `express` - Web framework
- `cors` - CORS middleware
- `jsonwebtoken` - JWT authentication
- `bcryptjs` - Password hashing
- `body-parser` - Request body parsing
