// ============================================================
// Authentication Routes
// Handles user registration and login
// POST /api/auth/register - Create new account
// POST /api/auth/login    - Login and get JWT token
// GET  /api/auth/me       - Get current user profile
// ============================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// ============================================================
// POST /api/auth/register
// Create a new user account
// ============================================================
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                error: 'Missing fields',
                message: 'Name, email, and password are required.'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Invalid email',
                message: 'Please provide a valid email address.'
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                error: 'Weak password',
                message: 'Password must be at least 6 characters long.'
            });
        }

        // Check if email already exists
        const [existingUsers] = await pool.query(
            'SELECT user_id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                error: 'Email exists',
                message: 'An account with this email already exists.'
            });
        }

        // Hash the password (10 salt rounds)
        // bcrypt automatically generates a salt and hashes the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Only allow 'student' or 'instructor' roles (not 'admin')
        const userRole = (role === 'instructor') ? 'instructor' : 'student';

        // Insert new user into database
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, userRole]
        );

        // Generate JWT token for immediate login after registration
        const token = jwt.sign(
            {
                user_id: result.insertId,
                email: email,
                role: userRole,
                name: name
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        // Return success response with token
        res.status(201).json({
            message: 'Registration successful!',
            token: token,
            user: {
                user_id: result.insertId,
                name: name,
                email: email,
                role: userRole,
                wallet_balance: 0.00
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Registration failed',
            message: 'An error occurred during registration.'
        });
    }
});

// ============================================================
// POST /api/auth/login
// Authenticate user and return JWT token
// ============================================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                error: 'Missing fields',
                message: 'Email and password are required.'
            });
        }

        // Find user by email
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid email or password.'
            });
        }

        const user = users[0];

        // Compare provided password with stored hash
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid email or password.'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                user_id: user.user_id,
                email: user.email,
                role: user.role,
                name: user.name
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        // Return success response
        res.json({
            message: 'Login successful!',
            token: token,
            user: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role,
                wallet_balance: parseFloat(user.wallet_balance)
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed',
            message: 'An error occurred during login.'
        });
    }
});

// ============================================================
// GET /api/auth/me
// Get current logged-in user's profile
// Requires: JWT token in Authorization header
// ============================================================
router.get('/me', verifyToken, async (req, res) => {
    try {
        // Get fresh user data from database
        const [users] = await pool.query(
            'SELECT user_id, name, email, role, wallet_balance, created_at FROM users WHERE user_id = ?',
            [req.user.user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: 'User account no longer exists.'
            });
        }

        const user = users[0];
        user.wallet_balance = parseFloat(user.wallet_balance);

        res.json({ user });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            error: 'Failed to get profile',
            message: 'An error occurred while fetching your profile.'
        });
    }
});

module.exports = router;
