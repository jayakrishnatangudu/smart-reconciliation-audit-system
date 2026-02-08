const mongoose = require('mongoose');

/**
 * Validate email format
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate password strength
 */
const isValidPassword = (password) => {
    return password && password.length >= 6;
};

/**
 * Validate MongoDB ObjectId
 */
const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Validate date string
 */
const isValidDate = (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
};

/**
 * Sanitize string input (trim and remove extra spaces)
 */
const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.trim().replace(/\s+/g, ' ');
};

/**
 * Middleware to validate registration data
 */
const validateRegistration = (req, res, next) => {
    const { username, email, password, role } = req.body;

    // Check required fields
    if (!username || !email || !password) {
        return res.status(400).json({
            error: 'Missing required fields',
            details: {
                username: !username ? 'Username is required' : undefined,
                email: !email ? 'Email is required' : undefined,
                password: !password ? 'Password is required' : undefined
            }
        });
    }

    // Validate email format
    if (!isValidEmail(email)) {
        return res.status(400).json({
            error: 'Invalid email format'
        });
    }

    // Validate password strength
    if (!isValidPassword(password)) {
        return res.status(400).json({
            error: 'Password must be at least 6 characters long'
        });
    }

    // Validate role if provided
    if (role && !['Admin', 'Analyst', 'Viewer'].includes(role)) {
        return res.status(400).json({
            error: 'Invalid role. Must be Admin, Analyst, or Viewer'
        });
    }

    // Sanitize inputs
    req.body.username = sanitizeString(username);
    req.body.email = sanitizeString(email.toLowerCase());

    next();
};

/**
 * Middleware to validate login data
 */
const validateLogin = (req, res, next) => {
    const { email, password } = req.body;

    // Check required fields
    if (!email || !password) {
        return res.status(400).json({
            error: 'Email and password are required'
        });
    }

    // Validate email format
    if (!isValidEmail(email)) {
        return res.status(400).json({
            error: 'Invalid email format'
        });
    }

    // Sanitize email
    req.body.email = sanitizeString(email.toLowerCase());

    next();
};

/**
 * Middleware to validate ObjectId parameters
 */
const validateObjectId = (paramName) => {
    return (req, res, next) => {
        const id = req.params[paramName];

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                error: `Invalid ${paramName} format`
            });
        }

        next();
    };
};

/**
 * Middleware to validate date query parameters
 */
const validateDateParams = (req, res, next) => {
    const { startDate, endDate } = req.query;

    if (startDate && !isValidDate(startDate)) {
        return res.status(400).json({
            error: 'Invalid startDate format'
        });
    }

    if (endDate && !isValidDate(endDate)) {
        return res.status(400).json({
            error: 'Invalid endDate format'
        });
    }

    next();
};

module.exports = {
    isValidEmail,
    isValidPassword,
    isValidObjectId,
    isValidDate,
    sanitizeString,
    validateRegistration,
    validateLogin,
    validateObjectId,
    validateDateParams
};
