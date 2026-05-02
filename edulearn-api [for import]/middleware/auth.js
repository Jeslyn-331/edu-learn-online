// ============================================================
// Authentication Middleware
// Verifies JWT tokens and protects routes
// ============================================================

const jwt = require('jsonwebtoken');
require('dotenv').config();

// ============================================================
// Middleware: Verify JWT Token
// Checks if the request has a valid JWT token in the header
// Usage: Add this middleware to any route that needs authentication
// ============================================================
const verifyToken = (req, res, next) => {
    try {
        // Get token from Authorization header
        // Format: "Bearer <token>"
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'No token provided. Please log in.'
            });
        }

        // Extract the token (remove "Bearer " prefix)
        const token = authHeader.split(' ')[1];

        // Verify the token using our secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach user info to the request object
        // This makes user data available in route handlers
        req.user = {
            user_id: decoded.user_id,
            email: decoded.email,
            role: decoded.role,
            name: decoded.name
        };

        // Continue to the next middleware/route handler
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expired',
                message: 'Your session has expired. Please log in again.'
            });
        }
        return res.status(401).json({
            error: 'Invalid token',
            message: 'Authentication failed. Please log in again.'
        });
    }
};

// ============================================================
// Middleware: Check if user is an Instructor
// Must be used AFTER verifyToken middleware
// ============================================================
const isInstructor = (req, res, next) => {
    if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Access denied',
            message: 'Only instructors can perform this action.'
        });
    }
    next();
};

// ============================================================
// Middleware: Check if user is an Admin
// Must be used AFTER verifyToken middleware
// ============================================================
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Access denied',
            message: 'Only admins can perform this action.'
        });
    }
    next();
};

// ============================================================
// Middleware: Optional Authentication
// Attaches user info if token exists, but doesn't block the request
// Useful for routes that show different content for logged-in users
// ============================================================
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = {
                user_id: decoded.user_id,
                email: decoded.email,
                role: decoded.role,
                name: decoded.name
            };
        }
    } catch (error) {
        // Token is invalid, but we don't block the request
        req.user = null;
    }
    next();
};

module.exports = { verifyToken, isInstructor, isAdmin, optionalAuth };
