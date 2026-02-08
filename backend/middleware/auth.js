const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

/**
 * Authentication middleware - verify JWT token
 */
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Authentication token is missing' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'User not found. Please login again.' });
        }

        req.user = user;
        req.token = token;
        req.ipAddress = req.ip || req.connection.remoteAddress;
        req.userAgent = req.get('User-Agent') || 'Unknown';

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid authentication token' });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Authentication token has expired. Please login again.' });
        }
        console.error('Auth middleware error:', error);
        res.status(401).json({ error: 'Please authenticate' });
    }
};

/**
 * Role-based authorization middleware
 * Enforces that user has one of the required roles
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            // Log unauthorized access attempt
            AuditLog.create({
                action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
                entityType: 'Record',
                changedBy: req.user._id,
                source: 'API',
                newValue: {
                    attemptedRoute: req.originalUrl,
                    attemptedMethod: req.method,
                    requiredRoles: allowedRoles,
                    userRole: req.user.role
                },
                ipAddress: req.ipAddress,
                userAgent: req.userAgent
            }).catch(err => console.error('Failed to log unauthorized access:', err));

            return res.status(403).json({
                error: 'Access denied. Insufficient permissions.',
                requiredRoles: allowedRoles,
                yourRole: req.user.role
            });
        }

        next();
    };
};

/**
 * Audit logging middleware - logs all important actions
 */
const auditLog = (action, entityType) => {
    return async (req, res, next) => {
        // Store original send function
        const originalSend = res.send;

        // Override send function to capture response
        res.send = function (data) {
            // Only log successful responses (2xx)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                AuditLog.create({
                    action,
                    entityType,
                    changedBy: req.user._id,
                    source: 'API',
                    newValue: {
                        route: req.originalUrl,
                        method: req.method,
                        params: req.params,
                        query: req.query
                    },
                    ipAddress: req.ipAddress,
                    userAgent: req.userAgent
                }).catch(err => console.error('Audit log error:', err));
            }

            // Call original send
            originalSend.call(this, data);
        };

        next();
    };
};

/**
 * Rate limiting middleware (simple implementation)
 */
const rateLimit = (maxRequests = 100, windowMs = 60000) => {
    const requests = new Map();

    return (req, res, next) => {
        const key = `${req.user?._id || req.ip}`;
        const now = Date.now();

        if (!requests.has(key)) {
            requests.set(key, []);
        }

        const userRequests = requests.get(key);

        // Remove old requests outside the window
        const recentRequests = userRequests.filter(time => now - time < windowMs);
        requests.set(key, recentRequests);

        if (recentRequests.length >= maxRequests) {
            return res.status(429).json({
                error: 'Too many requests. Please try again later.',
                retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
            });
        }

        recentRequests.push(now);
        next();
    };
};

module.exports = {
    auth,
    authorize,
    auditLog,
    rateLimit
};
