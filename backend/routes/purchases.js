// ============================================================
// Purchase Routes
// Handles buying courses and individual lessons
// POST /api/purchases/course/:id  - Buy a full course
// POST /api/purchases/lesson/:id  - Buy a single lesson
// GET  /api/purchases             - Get user's purchases
// ============================================================

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// All purchase routes require authentication
router.use(verifyToken);

// ============================================================
// POST /api/purchases/course/:id
// Purchase a full course
// Steps:
//   1. Check if course exists
//   2. Check if already purchased
//   3. Check wallet balance
//   4. Deduct from wallet
//   5. Record purchase & transaction
//   6. Create enrollment
//   7. Credit instructor's wallet
// ============================================================
router.post('/course/:id', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const courseId = req.params.id;
        const userId = req.user.user_id;

        // Start database transaction
        await connection.beginTransaction();

        // 1. Get course details
        const [courses] = await connection.query(
            'SELECT * FROM courses WHERE course_id = ? AND is_published = TRUE',
            [courseId]
        );

        if (courses.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                error: 'Course not found',
                message: 'The course does not exist or is not available.'
            });
        }

        const course = courses[0];
        const price = parseFloat(course.price);

        // Prevent buying own course
        if (course.instructor_id === userId) {
            await connection.rollback();
            return res.status(400).json({
                error: 'Cannot purchase',
                message: 'You cannot purchase your own course.'
            });
        }

        // 2. Check if already purchased
        const [existingPurchase] = await connection.query(
            'SELECT purchase_id FROM purchases WHERE user_id = ? AND course_id = ?',
            [userId, courseId]
        );

        if (existingPurchase.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                error: 'Already purchased',
                message: 'You have already purchased this course.'
            });
        }

        // 3. Check wallet balance
        const [users] = await connection.query(
            'SELECT wallet_balance FROM users WHERE user_id = ?',
            [userId]
        );

        const walletBalance = parseFloat(users[0].wallet_balance);

        if (walletBalance < price) {
            await connection.rollback();
            return res.status(400).json({
                error: 'Insufficient balance',
                message: `You need $${price.toFixed(2)} but only have $${walletBalance.toFixed(2)}. Please top up your wallet.`,
                required: price,
                current_balance: walletBalance
            });
        }

        // 4. Deduct from buyer's wallet
        await connection.query(
            'UPDATE users SET wallet_balance = wallet_balance - ? WHERE user_id = ?',
            [price, userId]
        );

        // 5. Record the purchase
        await connection.query(
            'INSERT INTO purchases (user_id, course_id, price) VALUES (?, ?, ?)',
            [userId, courseId, price]
        );

        // 6. Record transaction (purchase type)
        await connection.query(
            'INSERT INTO transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)',
            [userId, price, 'purchase', `Purchased course: ${course.title}`]
        );

        // 7. Record wallet deduction
        await connection.query(
            'INSERT INTO wallet_history (user_id, amount, action, description) VALUES (?, ?, ?, ?)',
            [userId, price, 'deduct', `Course purchase: ${course.title}`]
        );

        // 8. Create enrollment
        await connection.query(
            'INSERT INTO enrollments (user_id, course_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE enrollment_id = enrollment_id',
            [userId, courseId]
        );

        // 9. Credit instructor's wallet (marketplace feature)
        await connection.query(
            'UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?',
            [price, course.instructor_id]
        );

        // 10. Record instructor's wallet addition
        await connection.query(
            'INSERT INTO wallet_history (user_id, amount, action, description) VALUES (?, ?, ?, ?)',
            [course.instructor_id, price, 'add', `Course sale: ${course.title}`]
        );

        // Commit all changes
        await connection.commit();

        // Get updated balance
        const [updatedUser] = await pool.query(
            'SELECT wallet_balance FROM users WHERE user_id = ?',
            [userId]
        );

        res.json({
            message: `Successfully purchased "${course.title}"!`,
            purchase: {
                course_id: parseInt(courseId),
                course_title: course.title,
                price: price
            },
            wallet_balance: parseFloat(updatedUser[0].wallet_balance)
        });

    } catch (error) {
        await connection.rollback();
        console.error('Purchase course error:', error);
        res.status(500).json({
            error: 'Purchase failed',
            message: 'An error occurred while processing your purchase.'
        });
    } finally {
        connection.release();
    }
});

// ============================================================
// POST /api/purchases/lesson/:id
// Purchase a single lesson
// Similar flow to course purchase but for individual lessons
// ============================================================
router.post('/lesson/:id', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const lessonId = req.params.id;
        const userId = req.user.user_id;

        await connection.beginTransaction();

        // 1. Get lesson details with course info
        const [lessons] = await connection.query(`
            SELECT l.*, c.title as course_title, c.instructor_id, c.course_id
            FROM lessons l
            JOIN courses c ON l.course_id = c.course_id
            WHERE l.lesson_id = ?
        `, [lessonId]);

        if (lessons.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                error: 'Lesson not found',
                message: 'The lesson does not exist.'
            });
        }

        const lesson = lessons[0];
        const price = parseFloat(lesson.price);

        // Prevent buying own lesson
        if (lesson.instructor_id === userId) {
            await connection.rollback();
            return res.status(400).json({
                error: 'Cannot purchase',
                message: 'You cannot purchase your own lesson.'
            });
        }

        // Check if user already has access (purchased lesson or full course)
        const [existingAccess] = await connection.query(
            `SELECT purchase_id FROM purchases 
             WHERE user_id = ? AND (lesson_id = ? OR course_id = ?)`,
            [userId, lessonId, lesson.course_id]
        );

        if (existingAccess.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                error: 'Already purchased',
                message: 'You already have access to this lesson.'
            });
        }

        // Check if lesson is free (preview)
        if (lesson.is_preview) {
            await connection.rollback();
            return res.status(400).json({
                error: 'Free lesson',
                message: 'This lesson is free to view. No purchase needed.'
            });
        }

        // 3. Check wallet balance
        const [users] = await connection.query(
            'SELECT wallet_balance FROM users WHERE user_id = ?',
            [userId]
        );

        const walletBalance = parseFloat(users[0].wallet_balance);

        if (walletBalance < price) {
            await connection.rollback();
            return res.status(400).json({
                error: 'Insufficient balance',
                message: `You need $${price.toFixed(2)} but only have $${walletBalance.toFixed(2)}. Please top up your wallet.`,
                required: price,
                current_balance: walletBalance
            });
        }

        // 4. Deduct from buyer's wallet
        await connection.query(
            'UPDATE users SET wallet_balance = wallet_balance - ? WHERE user_id = ?',
            [price, userId]
        );

        // 5. Record the purchase (lesson_id set, course_id NULL)
        await connection.query(
            'INSERT INTO purchases (user_id, lesson_id, price) VALUES (?, ?, ?)',
            [userId, lessonId, price]
        );

        // 6. Record transaction
        await connection.query(
            'INSERT INTO transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)',
            [userId, price, 'purchase', `Purchased lesson: ${lesson.title} (${lesson.course_title})`]
        );

        // 7. Record wallet deduction
        await connection.query(
            'INSERT INTO wallet_history (user_id, amount, action, description) VALUES (?, ?, ?, ?)',
            [userId, price, 'deduct', `Lesson purchase: ${lesson.title}`]
        );

        // 8. Credit instructor's wallet
        await connection.query(
            'UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?',
            [price, lesson.instructor_id]
        );

        // 9. Record instructor's wallet addition
        await connection.query(
            'INSERT INTO wallet_history (user_id, amount, action, description) VALUES (?, ?, ?, ?)',
            [lesson.instructor_id, price, 'add', `Lesson sale: ${lesson.title}`]
        );

        await connection.commit();

        // Get updated balance
        const [updatedUser] = await pool.query(
            'SELECT wallet_balance FROM users WHERE user_id = ?',
            [userId]
        );

        res.json({
            message: `Successfully purchased lesson "${lesson.title}"!`,
            purchase: {
                lesson_id: parseInt(lessonId),
                lesson_title: lesson.title,
                course_title: lesson.course_title,
                price: price
            },
            wallet_balance: parseFloat(updatedUser[0].wallet_balance)
        });

    } catch (error) {
        await connection.rollback();
        console.error('Purchase lesson error:', error);
        res.status(500).json({
            error: 'Purchase failed',
            message: 'An error occurred while processing your purchase.'
        });
    } finally {
        connection.release();
    }
});

// ============================================================
// GET /api/purchases
// Get all purchases for the logged-in user
// Returns both course and lesson purchases
// ============================================================
router.get('/', async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Get course purchases
        const [coursePurchases] = await pool.query(`
            SELECT p.purchase_id, p.price, p.purchased_at,
                   c.course_id, c.title as course_title, c.description, c.image_url,
                   u.name as instructor_name
            FROM purchases p
            JOIN courses c ON p.course_id = c.course_id
            JOIN users u ON c.instructor_id = u.user_id
            WHERE p.user_id = ? AND p.course_id IS NOT NULL AND p.lesson_id IS NULL
            ORDER BY p.purchased_at DESC
        `, [userId]);

        // Get lesson purchases
        const [lessonPurchases] = await pool.query(`
            SELECT p.purchase_id, p.price, p.purchased_at,
                   l.lesson_id, l.title as lesson_title, l.video_url,
                   c.course_id, c.title as course_title,
                   u.name as instructor_name
            FROM purchases p
            JOIN lessons l ON p.lesson_id = l.lesson_id
            JOIN courses c ON l.course_id = c.course_id
            JOIN users u ON c.instructor_id = u.user_id
            WHERE p.user_id = ? AND p.lesson_id IS NOT NULL
            ORDER BY p.purchased_at DESC
        `, [userId]);

        // Convert prices
        coursePurchases.forEach(p => { p.price = parseFloat(p.price); });
        lessonPurchases.forEach(p => { p.price = parseFloat(p.price); });

        res.json({
            course_purchases: coursePurchases,
            lesson_purchases: lessonPurchases,
            total_spent: [...coursePurchases, ...lessonPurchases].reduce((sum, p) => sum + p.price, 0)
        });

    } catch (error) {
        console.error('Get purchases error:', error);
        res.status(500).json({
            error: 'Failed to get purchases',
            message: 'An error occurred while fetching your purchases.'
        });
    }
});

module.exports = router;
