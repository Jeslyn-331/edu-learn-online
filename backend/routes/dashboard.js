// ============================================================
// Dashboard Routes - Best-Selling Courses Analytics
// Public analytics dashboard showing top-selling courses
// GET /api/dashboard/best-sellers   - Top selling courses
// GET /api/dashboard/stats          - Platform-wide statistics
// GET /api/dashboard/revenue        - Revenue analytics
// ============================================================

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// ============================================================
// GET /api/dashboard/best-sellers
// Returns top-selling courses ranked by number of sales
// Uses SQL GROUP BY + COUNT for aggregation
// ============================================================
router.get('/best-sellers', async (req, res) => {
    try {
        // Optional query parameter: ?limit=5 (default 10)
        const limit = parseInt(req.query.limit) || 10;

        // SQL Query: Join purchases with courses and users (instructors)
        // GROUP BY course to count total sales and sum revenue
        // ORDER BY total_sales DESC to rank best sellers
        const [bestSellers] = await pool.query(`
            SELECT 
                c.course_id,
                c.title,
                c.description,
                c.price AS course_price,
                c.image_url,
                u.name AS instructor_name,
                COUNT(p.purchase_id) AS total_sales,
                COALESCE(SUM(p.price), 0) AS total_revenue,
                COUNT(DISTINCT e.user_id) AS total_students
            FROM courses c
            LEFT JOIN purchases p ON c.course_id = p.course_id
            LEFT JOIN enrollments e ON c.course_id = e.course_id
            JOIN users u ON c.instructor_id = u.user_id
            WHERE c.is_published = TRUE
            GROUP BY c.course_id, c.title, c.description, c.price, 
                     c.image_url, u.name
            ORDER BY total_sales DESC, total_revenue DESC
            LIMIT ?
        `, [limit]);

        // Format numbers properly
        bestSellers.forEach(course => {
            course.course_price = parseFloat(course.course_price);
            course.total_revenue = parseFloat(course.total_revenue);
        });

        res.json({
            best_sellers: bestSellers,
            total_courses: bestSellers.length,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Best sellers error:', error);
        res.status(500).json({
            error: 'Failed to fetch best sellers',
            message: 'An error occurred while fetching analytics data.'
        });
    }
});

// ============================================================
// GET /api/dashboard/stats
// Returns platform-wide statistics (overview numbers)
// ============================================================
router.get('/stats', async (req, res) => {
    try {
        // Total published courses
        const [courseCount] = await pool.query(
            'SELECT COUNT(*) as total FROM courses WHERE is_published = TRUE'
        );

        // Total registered users
        const [userCount] = await pool.query(
            'SELECT COUNT(*) as total FROM users'
        );

        // Total students (users with role = student)
        const [studentCount] = await pool.query(
            "SELECT COUNT(*) as total FROM users WHERE role = 'student'"
        );

        // Total instructors
        const [instructorCount] = await pool.query(
            "SELECT COUNT(*) as total FROM users WHERE role = 'instructor'"
        );

        // Total purchases made
        const [purchaseCount] = await pool.query(
            'SELECT COUNT(*) as total FROM purchases'
        );

        // Total revenue (sum of all purchase prices)
        const [totalRevenue] = await pool.query(
            'SELECT COALESCE(SUM(price), 0) as total FROM purchases'
        );

        // Total enrollments
        const [enrollmentCount] = await pool.query(
            'SELECT COUNT(*) as total FROM enrollments'
        );

        // Total certificates issued
        const [certCount] = await pool.query(
            'SELECT COUNT(*) as total FROM certificates'
        );

        res.json({
            stats: {
                total_courses: courseCount[0].total,
                total_users: userCount[0].total,
                total_students: studentCount[0].total,
                total_instructors: instructorCount[0].total,
                total_purchases: purchaseCount[0].total,
                total_revenue: parseFloat(totalRevenue[0].total),
                total_enrollments: enrollmentCount[0].total,
                total_certificates: certCount[0].total
            }
        });

    } catch (error) {
        console.error('Platform stats error:', error);
        res.status(500).json({
            error: 'Failed to fetch stats',
            message: 'An error occurred while fetching platform statistics.'
        });
    }
});

// ============================================================
// GET /api/dashboard/revenue
// Returns revenue breakdown by course (for charts)
// ============================================================
router.get('/revenue', async (req, res) => {
    try {
        // Revenue per course (for bar chart)
        const [revenueByCourse] = await pool.query(`
            SELECT 
                c.course_id,
                c.title,
                COUNT(p.purchase_id) AS total_sales,
                COALESCE(SUM(p.price), 0) AS total_revenue
            FROM courses c
            LEFT JOIN purchases p ON c.course_id = p.course_id
            WHERE c.is_published = TRUE
            GROUP BY c.course_id, c.title
            ORDER BY total_revenue DESC
        `);

        revenueByCourse.forEach(item => {
            item.total_revenue = parseFloat(item.total_revenue);
        });

        // Recent purchases (last 10)
        const [recentPurchases] = await pool.query(`
            SELECT 
                p.purchase_id,
                p.price,
                p.purchased_at,
                u.name AS buyer_name,
                c.title AS course_title
            FROM purchases p
            JOIN users u ON p.user_id = u.user_id
            LEFT JOIN courses c ON p.course_id = c.course_id
            ORDER BY p.purchased_at DESC
            LIMIT 10
        `);

        recentPurchases.forEach(p => {
            p.price = parseFloat(p.price);
        });

        // Total revenue
        const totalRevenue = revenueByCourse.reduce((sum, c) => sum + c.total_revenue, 0);

        res.json({
            total_revenue: totalRevenue,
            revenue_by_course: revenueByCourse,
            recent_purchases: recentPurchases
        });

    } catch (error) {
        console.error('Revenue analytics error:', error);
        res.status(500).json({
            error: 'Failed to fetch revenue data',
            message: 'An error occurred while fetching revenue analytics.'
        });
    }
});

module.exports = router;
