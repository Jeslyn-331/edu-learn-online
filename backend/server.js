// ============================================================
// EduLearn Backend Server
// Main entry point for the Express.js API
// ============================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import database connection
const { testConnection } = require('./config/database');

// Import route files
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const lessonRoutes = require('./routes/lessons');
const walletRoutes = require('./routes/wallet');
const purchaseRoutes = require('./routes/purchases');
const progressRoutes = require('./routes/progress');
const adminRoutes = require('./routes/admin');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// MIDDLEWARE
// ============================================================

// Security headers (protects against common web vulnerabilities)
app.use(helmet());

// Enable CORS (Cross-Origin Resource Sharing)
// Allows frontend to make requests to this API
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// HTTP request logging (useful for debugging)
app.use(morgan('dev'));

// ============================================================
// API ROUTES
// ============================================================

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'EduLearn API is running!',
        timestamp: new Date().toISOString()
    });
});

// Authentication routes (register, login)
app.use('/api/auth', authRoutes);

// Course routes (CRUD operations)
app.use('/api/courses', courseRoutes);

// Lesson routes (CRUD operations)
app.use('/api/lessons', lessonRoutes);

// Wallet routes (top-up, balance, history)
app.use('/api/wallet', walletRoutes);

// Purchase routes (buy courses/lessons)
app.use('/api/purchases', purchaseRoutes);

// Progress routes (track learning progress)
app.use('/api/progress', progressRoutes);

// Admin/Instructor routes (dashboard, earnings)
app.use('/api/admin', adminRoutes);

// ============================================================
// ERROR HANDLING
// ============================================================

// 404 handler - Route not found
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        message: `The route ${req.method} ${req.originalUrl} does not exist`
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, async () => {
    console.log('============================================================');
    console.log(`🚀 EduLearn API Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 API URL: http://localhost:${PORT}/api`);
    console.log('============================================================');
    
    // Test database connection on startup
    await testConnection();
});

module.exports = app;
