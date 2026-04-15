// ============================================================
// Admin / Instructor Routes
// Dashboard, earnings, and management features
// GET  /api/admin/dashboard     - Instructor dashboard stats
// GET  /api/admin/courses       - Get instructor's courses
// GET  /api/admin/earnings      - Get earnings breakdown
// GET  /api/admin/students      - Get enrolled students
// POST /api/admin/withdraw      - Withdraw earnings
// ============================================================

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { verifyToken, isInstructor } = require('../middleware/auth');

// All admin routes require authentication + instructor role
router.use(verifyToken);
router.use(isInstructor);

// ============================================================
// GET /api/admin/dashboard
// Get instructor dashboard statistics
// ============================================================
router.get('/dashboard', async (req, res) => {
    try {
        const instructorId = req.user.user_id;

        // Total courses created
        const [courseCount] = await pool.query(
            'SELECT COUNT(*) as total FROM courses WHERE instructor_id = ?',
            [instructorId]
        );

        // Total lessons created
        const [lessonCount] = await pool.query(`
            SELECT COUNT(*) as total FROM lessons l
            JOIN courses c ON l.course_id = c.course_id
            WHERE c.instructor_id = ?
        `, [instructorId]);

        // Total students enrolled in instructor's courses
        const [studentCount] = await pool.query(`
            SELECT COUNT(DISTINCT e.user_id) as total FROM enrollments e
            JOIN courses c ON e.course_id = c.course_id
            WHERE c.instructor_id = ?
        `, [instructorId]);

        // Total earnings (from wallet history - sales)
        const [earnings] = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) as total FROM wallet_history
            WHERE user_id = ? AND action = 'add' AND description LIKE '%sale%'
        `, [instructorId]);

        // Total purchases of instructor's content
        const [purchaseCount] = await pool.query(`
            SELECT COUNT(*) as total FROM purchases p
            JOIN courses c ON p.course_id = c.course_id
            WHERE c.instructor_id = ?
        `, [instructorId]);

        // Get wallet balance
        const [user] = await pool.query(
            'SELECT wallet_balance FROM users WHERE user_id = ?',
            [instructorId]
        );

        res.json({
            dashboard: {
                total_courses: courseCount[0].total,
                total_lessons: lessonCount[0].total,
                total_students: studentCount[0].total,
                total_earnings: parseFloat(earnings[0].total),
                total_sales: purchaseCount[0].total,
                wallet_balance: parseFloat(user[0].wallet_balance)
            }
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            error: 'Failed to load dashboard',
            message: 'An error occurred while loading the dashboard.'
        });
    }
});

// ============================================================
// GET /api/admin/courses
// Get all courses created by the instructor (including unpublished)
// ============================================================
router.get('/courses', async (req, res) => {
    try {
        const instructorId = req.user.user_id;

        const [courses] = await pool.query(`
            SELECT c.*,
                   COUNT(DISTINCT e.enrollment_id) as student_count,
                   COUNT(DISTINCT l.lesson_id) as lesson_count,
                   COALESCE(SUM(DISTINCT p.price), 0) as total_revenue
            FROM courses c
            LEFT JOIN enrollments e ON c.course_id = e.course_id
            LEFT JOIN lessons l ON c.course_id = l.course_id
            LEFT JOIN purchases p ON c.course_id = p.course_id
            WHERE c.instructor_id = ?
            GROUP BY c.course_id
            ORDER BY c.created_at DESC
        `, [instructorId]);

        courses.forEach(course => {
            course.price = parseFloat(course.price);
            course.total_revenue = parseFloat(course.total_revenue);
        });

        res.json({ courses });

    } catch (error) {
        console.error('Get instructor courses error:', error);
        res.status(500).json({
            error: 'Failed to fetch courses',
            message: 'An error occurred while fetching your courses.'
        });
    }
});

// ============================================================
// GET /api/admin/earnings
// Get detailed earnings breakdown
// ============================================================
router.get('/earnings', async (req, res) => {
    try {
        const instructorId = req.user.user_id;

        // Get all sales (wallet additions from sales)
        const [sales] = await pool.query(`
            SELECT wallet_id, amount, description, created_at
            FROM wallet_history
            WHERE user_id = ? AND action = 'add' AND description LIKE '%sale%'
            ORDER BY created_at DESC
            LIMIT 50
        `, [instructorId]);

        sales.forEach(sale => {
            sale.amount = parseFloat(sale.amount);
        });

        // Get earnings by course
        const [earningsByCourse] = await pool.query(`
            SELECT c.course_id, c.title,
                   COUNT(p.purchase_id) as total_sales,
                   COALESCE(SUM(p.price), 0) as total_revenue
            FROM courses c
            LEFT JOIN purchases p ON c.course_id = p.course_id
            WHERE c.instructor_id = ?
            GROUP BY c.course_id
            ORDER BY total_revenue DESC
        `, [instructorId]);

        earningsByCourse.forEach(e => {
            e.total_revenue = parseFloat(e.total_revenue);
        });

        // Total earnings
        const totalEarnings = sales.reduce((sum, s) => sum + s.amount, 0);

        res.json({
            total_earnings: totalEarnings,
            recent_sales: sales,
            earnings_by_course: earningsByCourse
        });

    } catch (error) {
        console.error('Get earnings error:', error);
        res.status(500).json({
            error: 'Failed to fetch earnings',
            message: 'An error occurred while fetching your earnings.'
        });
    }
});

// ============================================================
// GET /api/admin/students
// Get list of students enrolled in instructor's courses
// ============================================================
router.get('/students', async (req, res) => {
    try {
        const instructorId = req.user.user_id;

        const [students] = await pool.query(`
            SELECT DISTINCT u.user_id, u.name, u.email,
                   c.course_id, c.title as course_title,
                   e.enrolled_at
            FROM enrollments e
            JOIN users u ON e.user_id = u.user_id
            JOIN courses c ON e.course_id = c.course_id
            WHERE c.instructor_id = ?
            ORDER BY e.enrolled_at DESC
        `, [instructorId]);

        res.json({ students });

    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({
            error: 'Failed to fetch students',
            message: 'An error occurred while fetching enrolled students.'
        });
    }
});

// ============================================================
// POST /api/admin/withdraw
// Withdraw money from wallet (simulated)
// In production, this would integrate with a payment gateway
// ============================================================
router.post('/withdraw', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { amount } = req.body;
        const instructorId = req.user.user_id;

        const withdrawAmount = parseFloat(amount);
        if (!withdrawAmount || withdrawAmount <= 0) {
            return res.status(400).json({
                error: 'Invalid amount',
                message: 'Please enter a valid withdrawal amount.'
            });
        }

        // Check balance
        const [users] = await connection.query(
            'SELECT wallet_balance FROM users WHERE user_id = ?',
            [instructorId]
        );

        const balance = parseFloat(users[0].wallet_balance);
        if (balance < withdrawAmount) {
            return res.status(400).json({
                error: 'Insufficient balance',
                message: `You only have $${balance.toFixed(2)} available for withdrawal.`
            });
        }

        await connection.beginTransaction();

        // Deduct from wallet
        await connection.query(
            'UPDATE users SET wallet_balance = wallet_balance - ? WHERE user_id = ?',
            [withdrawAmount, instructorId]
        );

        // Record wallet deduction
        await connection.query(
            'INSERT INTO wallet_history (user_id, amount, action, description) VALUES (?, ?, ?, ?)',
            [instructorId, withdrawAmount, 'deduct', `Withdrawal: $${withdrawAmount.toFixed(2)}`]
        );

        // Record transaction
        await connection.query(
            'INSERT INTO transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)',
            [instructorId, withdrawAmount, 'purchase', `Withdrawal to bank: $${withdrawAmount.toFixed(2)}`]
        );

        await connection.commit();

        // Get updated balance
        const [updatedUser] = await pool.query(
            'SELECT wallet_balance FROM users WHERE user_id = ?',
            [instructorId]
        );

        res.json({
            message: `Successfully withdrew $${withdrawAmount.toFixed(2)}!`,
            amount_withdrawn: withdrawAmount,
            wallet_balance: parseFloat(updatedUser[0].wallet_balance)
        });

    } catch (error) {
        await connection.rollback();
        console.error('Withdraw error:', error);
        res.status(500).json({
            error: 'Withdrawal failed',
            message: 'An error occurred while processing your withdrawal.'
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
