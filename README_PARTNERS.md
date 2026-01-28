# Partner API Documentation

## Overview

This API allows partner companies to route requests through users' residential IP addresses, similar to Honeygain's model.

## Authentication

All partner API requests require:
- `x-api-key`: Your partner API key
- `x-api-secret`: Your partner API secret

## Endpoints

### 1. Route Request Through User IP

**POST** `/api/partner/request`

Route a web request through a user's IP address.

**Headers:**
```
x-api-key: your-api-key
x-api-secret: your-api-secret
Content-Type: application/json
```

**Request Body:**
```json
{
  "targetUrl": "https://api.example.com/data",
  "method": "GET",
  "headers": {
    "User-Agent": "Custom-Agent"
  },
  "body": "{\"key\":\"value\"}",
  "userId": "optional-user-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* response data */ },
  "status": 200,
  "metadata": {
    "dataUsedMB": "0.1234",
    "cost": "0.0001",
    "userEarnings": "0.00007"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/partner/request \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -H "x-api-secret: your-api-secret" \
  -d '{
    "targetUrl": "https://jsonplaceholder.typicode.com/posts/1",
    "method": "GET"
  }'
```

### 2. Get Partner Statistics

**GET** `/api/partner/stats`

Get usage statistics for your partner account.

**Headers:**
```
x-api-key: your-api-key
x-api-secret: your-api-secret
```

**Query Parameters:**
- `startDate`: Start date (ISO format, default: 30 days ago)
- `endDate`: End date (ISO format, default: now)

**Response:**
```json
{
  "success": true,
  "data": {
    "partner": {
      "name": "Partner Name",
      "balance": 95.50,
      "totalUsageGB": 45.5,
      "totalSpent": 4.50
    },
    "period": {
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-01-31T23:59:59Z"
    },
    "statistics": {
      "totalRequests": 150,
      "totalDataMB": 46550,
      "totalCost": 4.50,
      "totalUserEarnings": 3.15
    }
  }
}
```

## Pricing Tiers

- **Tier 1 (Basic)**: $0.10 per GB
- **Tier 2 (Premium)**: $0.20 per GB
- **Tier 3 (Enterprise)**: $0.30 per GB

## Revenue Split

- **Platform Fee**: 30% (kept by platform)
- **User Share**: 70% (paid to users)

Example:
- Partner pays: $0.10 for 1 GB
- Platform keeps: $0.03
- User earns: $0.07

## Creating a Partner Account

Use the script:
```bash
node scripts/createPartner.js "Company Name" "email@company.com" "tier1"
```

Or create manually via MongoDB/API.

## Error Codes

- `401`: Invalid API credentials
- `400`: Bad request (missing parameters)
- `503`: No users available for routing
- `500`: Server error

## Rate Limits

Currently no rate limits, but will be implemented in production.

## Support

For partner support, contact: partners@bandwidthshare.com
