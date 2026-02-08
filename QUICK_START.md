# 🚀 QUICK START GUIDE

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] **Node.js** v18+ installed
- [ ] **MongoDB** v6+ installed and running
- [ ] **Redis** v6+ installed and running
- [ ] **Git** installed

---

## 1️⃣ Install MongoDB

### Windows
Download from: https://www.mongodb.com/try/download/community

### Mac
```bash
brew tap mongodb/brew
brew install mongodb-community@6.0
brew services start mongodb-community@6.0
```

### Linux (Ubuntu/Debian)
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

### Verify
```bash
mongosh
# Should connect successfully
```

---

## 2️⃣ Install Redis

### Windows
```bash
# Using Chocolatey
choco install redis-64

# OR download from: https://github.com/microsoftarchive/redis/releases
```

### Mac
```bash
brew install redis
brew services start redis
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
```

### Verify
```bash
redis-cli ping
# Should return: PONG
```

---

## 3️⃣ Clone & Install

```bash
# Navigate to project
cd d:/MERN/settyl-intern-assingment

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## 4️⃣ Environment Setup

### Backend Environment

```bash
cd backend

# Copy example environment file
cp .env.example .env
```

**Edit `backend/.env`:**
```env
NODE_ENV=development
PORT=5000

# MongoDB - Local
MONGO_URI=mongodb://localhost:27017/reconciliation

# JWT Secret - CHANGE THIS!
JWT_SECRET=your_super_secret_jwt_key_min_32_characters

# JWT Expiry
JWT_EXPIRE=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Frontend URL
FRONTEND_URL=http://localhost:5173

# File Upload
MAX_FILE_SIZE=104857600
UPLOAD_PATH=./uploads
```

### Frontend Environment

```bash
cd ../frontend

# Create .env file
cat > .env << 'EOF'
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
EOF
```

---

## 5️⃣ Start the Application

### 🎯 Option A: All Components Together (Recommended)

**Terminal 1 - Backend + Worker:**
```bash
cd backend
npm run dev:all
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 🎯 Option B: Separate Processes

**Terminal 1 - Backend Server:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Background Worker:**
```bash
cd backend
npm run dev:worker
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## 6️⃣ Access the Application

Once started, open your browser:

- **🌐 Frontend**: http://localhost:5173
- **🔧 Backend API**: http://localhost:5000
- **📚 API Docs**: http://localhost:5000/api/docs
- **💚 Health Check**: http://localhost:5000/health

---

## 7️⃣ Default Login Credentials

The system creates these users automatically on first run:

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | Admin@123 | Admin |
| analyst@example.com | Analyst@123 | Analyst |
| viewer@example.com | Viewer@123 | Viewer |

**⚠️ IMPORTANT**: Change these passwords in production!

---

## 8️⃣ Test the System

### Generate Test Data
```bash
cd backend

# Generate 1,000 records
node scripts/generateTestData.js 1000

# Generate 10,000 records
node scripts/generateTestData.js 10000

# Generate 50,000 records
node scripts/generateTestData.js 50000

# Generate all sizes
node scripts/generateTestData.js all
```

Files will be created in the root directory.

### Upload Test File

1. Login with admin@example.com / Admin@123
2. Navigate to Upload page
3. Select generated CSV file (e.g., `test-data-1k.csv`)
4. Map columns:
   - Transaction ID → transactionId
   - Amount → amount
   - Reference Number → referenceNumber
   - Date → date
5. Click Submit
6. Watch real-time progress
7. View results in Dashboard

---

## 9️⃣ Verify Everything Works

### ✅ Backend Health Check
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-02-28T...",
  "environment": "development",
  "uptime": 123.456
}
```

### ✅ API Docs
```bash
curl http://localhost:5000/api/docs
```

Should return comprehensive API information.

### ✅ Redis Connection
```bash
redis-cli ping
```

Should return: `PONG`

### ✅ MongoDB Connection
```bash
mongosh
use reconciliation
show collections
```

Should show: `users`, `matchingrules`, etc.

### ✅ Queue Working
Upload a file and check:
```bash
redis-cli
KEYS *bull*
```

Should show queue keys.

---

## 🔧 Troubleshooting

### "Redis connection refused"
```bash
# Check if Redis is running
redis-cli ping

# If not, start it:
# Windows: redis-server
# Mac: brew services start redis
# Linux: sudo systemctl start redis
```

### "MongoDB connection failed"
```bash
# Check if MongoDB is running
mongosh

# If not, start it:
# Windows: net start MongoDB
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### "Port 5000 already in use"
Option 1: Kill the process using port 5000
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

Option 2: Change port in `.env`
```env
PORT=5001
```

### "Worker not processing jobs"
1. Check Redis is running
2. Check worker terminal for errors
3. Restart worker:
```bash
cd backend
npm run dev:worker
```

### "File upload fails"
1. Check `uploads/` directory exists
2. Check disk space
3. Check `MAX_FILE_SIZE` in `.env`
4. Check file format (CSV or Excel only)

---

## 📱 Production Deployment

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Build frontend
cd frontend
npm run build

# Start backend with PM2
cd ../backend
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

### Environment Variables for Production

Create `backend/.env.production`:
```env
NODE_ENV=production
PORT=5000

# Use production MongoDB (MongoDB Atlas recommended)
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/reconciliation?retryWrites=true&w=majority

# Strong JWT secret (min 32 characters)
JWT_SECRET=use_a_strong_random_secret_here_min_32_chars

# Shorter expiry for production
JWT_EXPIRE=1d

# Production Redis (Redis Labs recommended)
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Production frontend URL
FRONTEND_URL=https://your-production-domain.com

MAX_FILE_SIZE=104857600
```

### Serve Frontend

Option 1: Using `serve`
```bash
cd frontend
npx serve -s dist -l 3000
```

Option 2: Using Nginx (recommended)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /path/to/frontend/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📊 Monitor the Application

### PM2 Monitoring
```bash
# View all processes
pm2 list

# View detailed info
pm2 info reconciliation-server

# View logs
pm2 logs

# Real-time monitoring
pm2 monit
```

### Redis Monitoring
```bash
redis-cli
INFO stats
KEYS *
```

### MongoDB Monitoring
```bash
mongosh
use reconciliation
db.stats()
db.uploadjobs.find().count()
```

---

## 🎓 Learning Resources

### Explore the Codebase

1. **Start here**: `README.md` - Overview and architecture
2. **API Reference**: `API_DOCUMENTATION.md` - All endpoints
3. **Deep Dive**: `ARCHITECTURE.md` - System design
4. **Fixes Applied**: `FIXES_IMPLEMENTED.md` - What was changed

### Key Files to Understand

**Backend Entry Points:**
- `server.js` - Main application server
- `worker.js` - Background job processor
- `config/queue.js` - Queue configuration

**Core Services:**
- `services/fileProcessingService.js` - File upload & parsing
- `services/reconciliationServiceV2.js` - Matching engine
- `services/rulesInitService.js` - Default rules setup

**Controllers:**
- `controllers/uploadController.js` - Upload endpoints
- `controllers/rulesController.js` - Rules management
- `controllers/auditController.js` - Audit logs

**Models:**
- `models/UploadJob.js` - Job tracking
- `models/Record.js` - Transaction records
- `models/ReconciliationResult.js` - Match results
- `models/MatchingRule.js` - Configurable rules
- `models/AuditLog.js` - Immutable audit trail

---

## 🧪 Testing Checklist

After starting the app, test:

- [ ] Login with default credentials
- [ ] Upload small CSV (1k records)
- [ ] Watch real-time progress
- [ ] View reconciliation results
- [ ] Check dashboard statistics
- [ ] Upload same file again (should detect duplicate)
- [ ] Create custom matching rule (Admin only)
- [ ] View audit logs
- [ ] Test role permissions (login as Analyst/Viewer)
- [ ] Export audit logs (Admin only)

---

## 🆘 Get Help

### Documentation
- `README.md` - Complete documentation
- `API_DOCUMENTATION.md` - API reference
- `ARCHITECTURE.md` - Architecture details
- `FIXES_IMPLEMENTED.md` - All fixes applied

### Check Logs
```bash
# Backend logs
npm run dev  # Shows console logs

# Worker logs
npm run dev:worker

# PM2 logs (production)
pm2 logs
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Can't login | Check MongoDB is running, check credentials |
| Upload fails | Check Redis is running, check worker process |
| Slow processing | Check worker logs, increase worker concurrency |
| API errors | Check backend logs, verify MongoDB connection |

---

## ✅ Success Indicators

You'll know everything is working when:

✅ Frontend loads at http://localhost:5173  
✅ You can login with default credentials  
✅ Health check returns OK  
✅ File upload shows progress bar  
✅ Worker process shows "Processing file job..."  
✅ Dashboard shows statistics  
✅ Reconciliation results display  
✅ Audit logs are populated

---

## 🎉 You're Ready!

The application is now running with:

- ✅ Asynchronous processing (Bull + Redis)
- ✅ Configurable matching rules
- ✅ Idempotency protection
- ✅ Immutable audit trail
- ✅ Role-based access control
- ✅ Transaction support
- ✅ Comprehensive error handling
- ✅ Production-ready architecture

**Happy Reconciling! 🚀**

---

**Need More Help?**

Refer to:
- Full setup: `README.md`
- API details: `API_DOCUMENTATION.md`
- Architecture: `ARCHITECTURE.md`
- All fixes: `FIXES_IMPLEMENTED.md`
