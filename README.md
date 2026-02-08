# Smart Reconciliation & Audit System (MERN Stack)

## 🎯 Project Overview

A production-grade reconciliation and audit system built with MongoDB, Express, React, and Node.js. This system handles large-scale financial reconciliation with configurable matching rules, comprehensive audit trails, role-based access control, and asynchronous processing.

---

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Matching Rules](#matching-rules)
- [Security](#security)
- [Scaling Assumptions](#scaling-assumptions)
- [Known Limitations](#known-limitations)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

### Core Functionality
- ✅ **Asynchronous File Processing** - Bull queue system with Redis for non-blocking 50k+ record processing
- ✅ **Configurable Matching Rules** - Database-backed rules engine (no hardcoded logic)
- ✅ **Idempotency** - SHA-256 file hashing prevents duplicate uploads
- ✅ **Immutable Audit Logs** - Write-once audit trail with schema-level protection
- ✅ **Role-Based Access Control** - Backend + frontend enforcement (Admin, Analyst, Viewer)
- ✅ **Partial Failure Handling** - Row-by-row error tracking without breaking entire batch
- ✅ **Duplicate Detection** - Cross-upload duplicate identification
- ✅ **Manual Corrections** - Full before/after audit trail
- ✅ **Real-time Updates** - Socket.IO for live job status updates
- ✅ **Column Mapping** - Remap CSV/Excel columns without re-upload
- ✅ **MongoDB Transactions** - ACID compliance for multi-collection operations

### Enhanced Features
- 📊 Dynamic dashboard with server-side aggregation
- 🔄 Smart reprocessing (skips unchanged data using rules version tracking)
- 🔍 Advanced search and filtering
- 📈 Comprehensive statistics and reporting
- 🎨 Premium UI/UX with glassmorphism and animations
- 📱 Fully responsive design

---

## 🏗️ Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│                 │      │                  │      │                 │
│   React Client  │◄────►│  Express Server  │◄────►│  MongoDB        │
│   (Frontend)    │      │  + Socket.IO     │      │  (Database)     │
│                 │      │                  │      │                 │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                               │      ▲
                               │      │
                               ▼      │
                         ┌──────────────────┐
                         │     Redis        │
                         │  (Bull Queue)    │
                         └──────────────────┘
                               │      ▲
                               │      │
                               ▼      │
                         ┌──────────────────┐
                         │  Worker Process  │
                         │  (Background)    │
                         └──────────────────┘
```

### Component Breakdown

1. **Frontend (React + Vite)**
   - Role-based UI components
   - Real-time Socket.IO updates
   - File upload with preview
   - Interactive dashboards

2. **Backend (Express + Node.js)**
   - RESTful API
   - JWT authentication
   - Role-based middleware
   - Central error handling
   - Request validation

3. **Queue System (Bull + Redis)**
   - Asynchronous file processing
   - Job retry logic
   - Progress tracking
   - Failure recovery

4. **Worker Process**
   - Background job execution
   - Independent scaling
   - Resource isolation

5. **Database (MongoDB)**
   - Document storage
   - Indexing strategy
   - Transaction support

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express 5.x
- **Database**: MongoDB 6.0+
- **Queue**: Bull + Redis 6.0+
- **Authentication**: JWT (jsonwebtoken)
- **File Processing**: Multer, csv-parser, xlsx
- **WebSockets**: Socket.IO

### Frontend
- **Framework**: React 18+
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **HTTP Client**: Axios
- **Real-time**: Socket.IO Client

### DevOps
- **Process Manager**: PM2 (production)
- **Development**: Nodemon, Concurrently

---

## 💻 System Requirements

- **Node.js**: v18.0.0 or higher
- **MongoDB**: v6.0 or higher
- **Redis**: v6.0 or higher
- **RAM**: Minimum 4GB (8GB recommended for 50k+ records)
- **Disk Space**: 10GB minimum (for uploads and logs)

---

## 📦 Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd settyl-intern-assignment
```

### 2. Backend Setup
```bash
cd backend
npm install
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

### 4. Install Redis (if not installed)

**Windows (using Chocolatey):**
```bash
choco install redis-64
```

**Windows (WSL):**
```bash
sudo apt-get install redis-server
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
```

### 5. Install MongoDB (if not installed)

Follow official MongoDB installation guide: https://www.mongodb.com/docs/manual/installation/

---

## ⚙️ Configuration

### Backend Environment Variables

Copy `.env.example` to `.env`:
```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values:
```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGO_URI=mongodb://localhost:27017/reconciliation

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Frontend
FRONTEND_URL=http://localhost:5173
```

### Frontend Environment Variables

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🚀 Running the Application

### Development Mode

#### Option 1: Run everything together
```bash
# Terminal 1 - Backend + Worker
cd backend
npm run dev:all

# Terminal 2 - Frontend
cd frontend
npm run dev
```

#### Option 2: Run separately 
```bash
# Terminal 1 - Backend Server
cd backend
npm run dev

# Terminal 2 - Worker Process
cd backend
npm run dev:worker

# Terminal 3 - Frontend
cd frontend
npm run dev

# Terminal 4 - Redis (if not running as service)
redis-server
```

### Production Mode

```bash
# Install PM2 globally
npm install -g pm2

# Start backend
cd backend
pm2 start ecosystem.config.js

# Build frontend
cd ../frontend
npm run build

# Serve frontend with nginx or serve
npx serve -s dist
```

### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **API Docs**: http://localhost:5000/api/docs
- **Health Check**: http://localhost:5000/health

---

## 📖 API Documentation

### Authentication

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}

Response: {
  "success": true,
  "token": "jwt_token_here",
  "user": { "id": "...", "email": "...", "role": "Admin" }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>

Response: {
  "success": true,
  "data": { "id": "...", "name": "...", "role": "Admin" }
}
```

### File Upload

#### Preview File
```http
POST /api/upload/preview
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file.csv>

Response: {
  "success": true,
  "preview": [...],
  "columns": [...],
  "tempFilePath": "..."
}
```

#### Submit File for Processing
```http
POST /api/upload/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "tempFilePath": "...",
  "columnMapping": {
    "transactionId": "Transaction ID",
    "amount": "Amount",
    "referenceNumber": "Ref Number",
    "date": "Date"
  }
}

Response: {
  "success": true,
  "jobId": "uploadjob_id_here",
  "queueJobId": "bull_job_id_here"
}
```

#### Get Upload Status
```http
GET /api/upload/status/:jobId
Authorization: Bearer <token>

Response: {
  "success": true,
  "data": {
    "status": "Processing",
    "progressPercent": 45,
    "totalRecords": 50000,
    "processedRecords": 22500
  }
}
```

### Reconciliation Results

#### Get Results for Upload
```http
GET /api/reconciliation/results/:uploadJobId
Authorization: Bearer <token>

Response: {
  "success": true,
  "count": 1000,
  "data": [...]
}
```

#### Manual Correction
```http
PUT /api/reconciliation/correct/:resultId
Authorization: Bearer <token>
Content-Type: application/json

{
  "correctedData": {
    "amount": 150.00
  },
  "reason": "Corrected duplicate transaction"
}

Response: {
  "success": true,
  "message": "Record corrected successfully"
}
```

### Matching Rules

#### Get All Rules
```http
GET /api/rules
Authorization: Bearer <token>

Response: {
  "success": true,
  "count": 5,
  "data": [...]
}
```

#### Create Rule (Admin Only)
```http
POST /api/rules
Authorization: Bearer <token>
Content-Type: application/json

{
  "ruleName": "Custom Match Rule",
  "ruleType": "PARTIAL_MATCH",
  "priority": 85,
  "enabled": true,
  "partialMatchConfig": {
    "amountVariancePercent": 3,
    "requiredFields": ["referenceNumber"]
  }
}

Response: {
  "success": true,
  "data": {...}
}
```

### Audit Logs

#### Get Audit Logs
```http
GET /api/audit/logs?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>

Response: {
  "success": true,
  "count": 150,
  "data": [...]
}
```

---

## 🗄️ Database Schema

### Collections

#### 1. Users
```javascript
{
  email: String (unique),
  password: String (hashed),
  name: String,
  role: Enum['Admin', 'Analyst', 'Viewer']
}
```

#### 2. UploadJobs
```javascript
{
  fileName: String,
  fileHash: String (SHA-256),
  uploadedBy: ObjectId (User),
  status: Enum['Pending', 'Processing', 'Completed', 'Failed', 'PartiallyFailed'],
  totalRecords: Number,
  processedRecords: Number,
  failedRecords: Number,
  matchedRecords: Number,
  partiallyMatchedRecords: Number,
  unmatchedRecords: Number,
  duplicateRecords: Number,
  columnMapping: Map,
  errorMessage: String,
  queueJobId: String,
  rulesVersion: String,
  progressPercent: Number,
  startedAt: Date,
  completedAt: Date
}
```

#### 3. Records
```javascript
{
  uploadJobId: ObjectId (UploadJob),
  transactionId: String,
  amount: Number,
  referenceNumber: String,
  date: Date,
  additionalData: Map
}
```

#### 4. ReconciliationResults
```javascript
{
  uploadJobId: ObjectId (UploadJob),
  recordId: ObjectId (Record),
  systemRecord: Object,
  uploadedRecord: Object,
  matchStatus: Enum['Matched', 'Partially Matched', 'Not Matched', 'Duplicate', 'Failed'],
  mismatchedFields: Array,
  matchedRule: String,
  duplicateReason: String,
  confidence: Number
}
```

#### 5. AuditLogs (Immutable)
```javascript
{
  recordId: ObjectId (Record),
  uploadJobId: ObjectId (UploadJob),
  action: Enum['CREATE', 'UPDATE', 'DELETE', 'RECONCILE', 'UPLOAD', 'MANUAL_CORRECTION'],
  entityType: Enum['Record', 'UploadJob', 'ReconciliationResult'],
  oldValue: Mixed,
  newValue: Mixed,
  changedBy: ObjectId (User),
  source: Enum['API', 'SYSTEM', 'MANUAL'],
  timestamp: Date (immutable),
  ipAddress: String,
  userAgent: String
}
```

#### 6. Matching Rules
```javascript
{
  ruleName: String (unique),
  description: String,
  ruleType: Enum['EXACT_MATCH', 'PARTIAL_MATCH', 'REFERENCE_MATCH', 'FUZZY_MATCH'],
  priority: Number,
  enabled: Boolean,
  exactMatchFields: Array,
  partialMatchConfig: {
    amountVariancePercent: Number,
    dateVarianceDays: Number,
    requiredFields: Array
  },
  createdBy: ObjectId (User),
  updatedBy: ObjectId (User)
}
```

---

## 🎯 Matching Rules

### Rule Types

1. **EXACT_MATCH** 
   - Matches all specified fields exactly
   - Example: transactionId + amount must be identical

2. **PARTIAL_MATCH**
   - Allows variance in specified fields
   - Example: ±2% amount variance with same reference number

3. **REFERENCE_MATCH**
   - Matches by reference number only
   - Reports mismatches in other fields

### Rule Priority

Rules are evaluated in priority order (highest first). First matching rule wins.

### Configuring Rules

#### Via API (Admin Only)
```bash
POST /api/rules
{
  "ruleName": "My Custom Rule",
  "ruleType": "PARTIAL_MATCH",
  "priority": 90,
  "enabled": true,
  "partialMatchConfig": {
    "amountVariancePercent": 5,
    "dateVarianceDays": 1,
    "requiredFields": ["referenceNumber"]
  }
}
```

#### Via Database
```javascript
db.matchingrules.insertOne({
  ruleName: "Weekend Exception Rule",
  ruleType: "PARTIAL_MATCH",
  priority: 75,
  enabled: true,
  partialMatchConfig: {
    amountVariancePercent: 10,
    dateVarianceDays: 3,
    requiredFields: ["referenceNumber"]
  }
})
```

---

## 🔒 Security

### Authentication
- JWT tokens with configurable expiration
- Bcrypt password hashing (10 rounds)
- Token refresh mechanism

### Authorization
- Role-based access control (RBAC)
- Backend middleware enforcement
- API-level permission checks

### Data Protection
- Immutable audit logs
- SHA-256 file hashing
- Environment-based secrets

### API Security
- CORS configuration
- Rate limiting (100 req/min per user)
- Input validation
- SQL injection protection (NoSQL)

---

## 📈 Scaling Assumptions

### Current Capacity
- **Records per upload**: 50,000
- **Concurrent uploads**: 10
- **API requests**: 1000/min
- **Users**: 100 concurrent

### Horizontal Scaling
```
Load Balancer
    │
    ├─── Server Instance 1
    ├─── Server Instance 2
    └─── Server Instance N
          │
          ▼
    Shared Redis Queue
          │
          ▼
    ├─── Worker Instance 1
    ├─── Worker Instance 2
    └─── Worker Instance N
          │
          ▼
    MongoDB Replica Set
```

### Vertical Scaling
- Increase worker concurrency in `config/queue.js`
- Add more MongoDB RAM
- Scale Redis memory

### Database Optimizations
- Compound indexes on frequently queried fields
- MongoDB sharding by `uploadJobId`
- Archive old uploads to separate collection

---

## ⚠️ Known Limitations

1. **File Size**: 100MB max (configurable in `MAX_FILE_SIZE`)
2. **Redis Dependency**: Requires Redis running for queue system
3. **Real-time Updates**: WebSocket connections limited by server capacity
4. **Column Mapping**: Must be done during initial upload (stored for future reference)
5. **File Formats**: CSV and Excel only (no JSON/XML yet)
6. **Fuzzy Matching**: Not fully implemented (placeholder in schema)
7. **Audit Log Deletion**: Not possible (by design for compliance)
8. **Multi-tenant**: Not currently supported (single organization)

---

## 🧪 Testing

### Manual Testing

#### Test Users
```javascript
// Created on first run
{
  email: "admin@example.com",
  password: "Admin@123",
  role: "Admin"
}
{
  email: "analyst@example.com",
  password: "Analyst@123",
  role: "Analyst"
}
{
  email: "viewer@example.com",
  password: "Viewer@123",
  role: "Viewer"
}
```

#### Sample Data
Use `sample-data.csv` in the root directory for testing.

### API Testing

Import Postman collection (TODO: Create `postman_collection.json`)

---

## 🚢 Deployment

### Production Checklist

- [ ] Set strong `JWT_SECRET` in `.env.production`
- [ ] Use production MongoDB instance
- [ ] Configure Redis password
- [ ] Enable HTTPS
- [ ] Set `NODE_ENV=production`
- [ ] Build frontend (`npm run build`)
- [ ] Configure reverse proxy (Nginx)
- [ ] Set up PM2 or Docker
- [ ] Enable monitoring (PM2 Monitor, MongoDB Atlas)
- [ ] Configure backups
- [ ] Set up logging (Winston, PM2 logs)

### PM2 Ecosystem File

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'recon-server',
      script: './server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'recon-worker',
      script: './worker.js',
      instances: 1,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

Run with:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 🐛 Troubleshooting

### Redis Connection Error
```
Error: Redis connection to localhost:6379 failed
```
**Solution**: Ensure Redis is running
```bash
# Check Redis status
redis-cli ping

# Start Redis
redis-server
```

### MongoDB Connection Error
```
Error: MongoServerError: bad auth
```
**Solution**: Check `MONGO_URI` in `.env`

### Worker Not Processing Jobs
**Solution**: 
1. Check Redis connection
2. Verify worker is running (`npm run dev:worker`)
3. Check worker logs for errors

### File Upload Fails
**Solution**:
1. Check `uploads/` directory exists
2. Verify disk space
3. Check `MAX_FILE_SIZE` setting

---

## 👥 Default Users

Created automatically on first run:

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | Admin@123 | Admin |
| analyst@example.com | Analyst@123 | Analyst |
| viewer@example.com | Viewer@123 | Viewer |

**⚠️ CHANGE THESE PASSWORDS IN PRODUCTION!**

---

## 📝 License

ISC

---

## 👨‍💻 Author

Smart Reconciliation System

---

## 🙏 Acknowledgments

- MongoDB for excellent documentation
- Bull for robust queue system
- Socket.IO for real-time capabilities

---

## 📞 Support

For issues and questions, please create an issue in the repository.

---

**Last Updated**: February 2026
**Version**: 2.0.0
