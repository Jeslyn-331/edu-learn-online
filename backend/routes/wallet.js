// ============================================================
// Wallet Routes
// Manages user wallet balance (top-up and history)
// GET  /api/wallet/balance  - Get current balance
// POST /api/wallet/topup    - Add money to wallet
// GET  /api/wallet/history  - Get wallet transaction history
// ============================================================

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// All wallet routes require authentication
router.use(verifyToken);

// ============================================================
// GET /api/wallet/balance
// Get current wallet balance for the logged-in user
// ============================================================
router.get('/balance', async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT wallet_balance FROM users WHERE user_id = ?',
            [req.user.user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: 'User account not found.'
            });
        }

        res.json({
            wallet_balance: parseFloat(users[0].wallet_balance)
        });

    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({
            error: 'Failed to get balance',
            message: 'An error occurred while fetching your balance.'
        });
    }
});

// ============================================================
// POST /api/wallet/topup
// Add money to the user's wallet
// This simulates a payment gateway (in production, integrate Stripe/PayPal)
// ============================================================
router.post('/topup', async (req, res) => {
    // Use a database transaction to ensure data consistency
    const connection = await pool.getConnection();
    
    try {
        const { amount } = req.body;

        // Validate amount
        const topupAmount = parseFloat(amount);
        if (!topupAmount || topupAmount <= 0) {
            return res.status(400).json({
                error: 'Invalid amount',
                message: 'Please enter a valid amount greater than 0.'
            });
        }

        // Maximum top-up limit (security measure)
        if (topupAmount > 10000) {
            return res.status(400).json({
                error: 'Amount too large',
                message: 'Maximum top-up amount is $10,000.'
            });
        }

        // Start database transaction
        await connection.beginTransaction();

        // 1. Update user's wallet balance
        await connection.query(
            'UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?',
            [topupAmount, req.user.user_id]
        );

        // 2. Record the transaction
        await connection.query(
            'INSERT INTO transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)',
            [req.user.user_id, topupAmount, 'top-up', `Wallet top-up of $${topupAmount.toFixed(2)}`]
        );

        // 3. Record in wallet history
        await connection.query(
            'INSERT INTO wallet_history (user_id, amount, action, description) VALUES (?, ?, ?, ?)',
            [req.user.user_id, topupAmount, 'add', `Top-up: +$${topupAmount.toFixed(2)}`]
        );

        // Commit the transaction (all changes are saved)
        await connection.commit();

        // Get updated balance
        const [users] = await pool.query(
            'SELECT wallet_balance FROM users WHERE user_id = ?',
            [req.user.user_id]
        );

        res.json({
            message: `Successfully added $${topupAmount.toFixed(2)} to your wallet!`,
            wallet_balance: parseFloat(users[0].wallet_balance),
            amount_added: topupAmount
        });

    } catch (error) {
        // Rollback transaction if anything fails
        await connection.rollback();
        console.error('Top-up error:', error);
        res.status(500).json({
            error: 'Top-up failed',
            message: 'An error occurred while processing your top-up.'
        });
    } finally {
        // Always release the connection back to the pool
        connection.release();
    }
});

// ============================================================
// GET /api/wallet/history
// Get wallet transaction history for the logged-in user
// Shows all additions and deductions
// ============================================================
router.get('/history', async (req, res) => {
    try {
        // Get wallet history (most recent first)
        const [history] = await pool.query(`
            SELECT wallet_id, amount, action, description, created_at
            FROM wallet_history
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        `, [req.user.user_id]);

        history.forEach(record => {
            record.amount = parseFloat(record.amount);
        });

        // Get transaction history
        const [transactions] = await pool.query(`
            SELECT transaction_id, amount, type, description, created_at
            FROM transactions
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        `, [req.user.user_id]);

        transactions.forEach(record => {
            record.amount = parseFloat(record.amount);
        });

        res.json({
            wallet_history: history,
            transactions: transactions
        });

    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({
            error: 'Failed to get history',
            message: 'An error occurred while fetching your wallet history.'
        });
    }
});

module.exports = router;
