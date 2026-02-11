require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const fs = require('fs');
const path = require('path');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { initializeDefaultRules } = require('./services/rulesInitService');

// Import routes
const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const reconciliationRoutes = require('./routes/reconciliationRoutes');
const auditRoutes = require('./routes/auditRoutes');
const rulesRoutes = require('./routes/rulesRoutes');

const app = express();

// Connect to MongoDB
connectDB().then(async () => {
    // Initialize default matching rules
    await initializeDefaultRules();
}).catch(err => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// CORS configuration
const corsOptions = {
    origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
    });
}

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date(),
        environment: process.env.NODE_ENV,
        uptime: process.uptime()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reconciliation', reconciliationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/rules', rulesRoutes);

// API documentation endpoint
app.get('/api/docs', (req, res) => {
    res.json({
        message: 'Smart Reconciliation & Audit System API',
        version: '2.0.0',
        endpoints: {
            auth: {
                login: 'POST /api/auth/login',
                register: 'POST /api/auth/register',
                me: 'GET /api/auth/me'
            },
            upload: {
                preview: 'POST /api/upload/preview',
                submit: 'POST /api/upload/submit',
                status: 'GET /api/upload/status/:jobId',
                all: 'GET /api/upload/all'
            },
            reconciliation: {
                results: 'GET /api/reconciliation/results/:uploadJobId',
                summary: 'GET /api/reconciliation/summary/:uploadJobId',
                reprocess: 'POST /api/reconciliation/reprocess/:uploadJobId',
                correct: 'PUT /api/reconciliation/correct/:resultId'
            },
            audit: {
                logs: 'GET /api/audit/logs',
                timeline: 'GET /api/audit/timeline/:recordId',
                export: 'GET /api/audit/export'
            },
            rules: {
                getAll: 'GET /api/rules',
                getOne: 'GET /api/rules/:id',
                create: 'POST /api/rules',
                update: 'PUT /api/rules/:id',
                delete: 'DELETE /api/rules/:id',
                toggle: 'PATCH /api/rules/:id/toggle',
                reorder: 'PUT /api/rules/reorder'
            }
        },
        documentation: 'See README.md for detailed API documentation'
    });
});

// Serve frontend static files
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));

// Handle SPA routing: serve index.html for non-API routes
app.get('*', (req, res, next) => {
    // If it's an API request, skip to 404 handler
    if (req.path.startsWith('/api')) {
        return next();
    }
    // Otherwise serve index.html if it exists
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        next();
    }
});

// 404 handler (must be after all routes)
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API Docs: http://localhost:${PORT}/api/docs`);
    console.log(`✅ Health Check: http://localhost:${PORT}/health`);
    console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nSIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    if (process.env.NODE_ENV === 'production') {
        server.close(() => process.exit(1));
    }
});

module.exports = app;
