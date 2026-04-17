// ============================================================
// Progress Routes
// Track user learning progress on lessons
// GET  /api/progress/course/:courseId - Get progress for a course
// POST /api/progress/:lessonId       - Update lesson progress
// GET  /api/progress/stats           - Get overall learning stats
// ============================================================

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// All progress routes require authentication
router.use(verifyToken);

// ============================================================
// GET /api/progress/all
// Get all progress records for the user (for history page)
// ============================================================
router.get('/all', async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Get all progress with lesson and course details
        const [progress] = await pool.query(`
            SELECT 
                p.progress_id,
                p.lesson_id,
                p.status,
                p.completed_at,
                p.updated_at,
                l.title as lesson_title,
                c.course_id,
                c.title as course_title
            FROM progress p
            JOIN lessons l ON p.lesson_id = l.lesson_id
            JOIN courses c ON l.course_id = c.course_id
            WHERE p.user_id = ?
            ORDER BY p.updated_at DESC
        `, [userId]);

        res.json({
            progress: progress
        });

    } catch (error) {
        console.error('Get all progress error:', error);
        res.status(500).json({
            error: 'Failed to get progress',
            message: 'An error occurred while fetching your progress.'
        });
    }
});

// ============================================================
// GET /api/progress/stats
// Get overall learning statistics for the user
// ============================================================
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Get total enrolled courses
        const [enrollments] = await pool.query(
            'SELECT COUNT(*) as total FROM enrollments WHERE user_id = ?',
            [userId]
        );

        // Get completed lessons count
        const [completed] = await pool.query(
            "SELECT COUNT(*) as total FROM progress WHERE user_id = ? AND status = 'completed'",
            [userId]
        );

        // Get in-progress lessons count
        const [inProgress] = await pool.query(
            "SELECT COUNT(*) as total FROM progress WHERE user_id = ? AND status = 'in_progress'",
            [userId]
        );

        // Get total purchases
        const [purchases] = await pool.query(
            'SELECT COUNT(*) as total FROM purchases WHERE user_id = ?',
            [userId]
        );

        res.json({
            stats: {
                enrolled_courses: enrollments[0].total,
                completed_lessons: completed[0].total,
                in_progress_lessons: inProgress[0].total,
                total_purchases: purchases[0].total
            }
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            error: 'Failed to get stats',
            message: 'An error occurred while fetching your learning stats.'
        });
    }
});

// ============================================================
// GET /api/progress/course/:courseId
// Get progress for all lessons in a specific course
// ============================================================
router.get('/course/:courseId', async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const userId = req.user.user_id;

        // Get all lessons with progress status
        const [lessons] = await pool.query(`
            SELECT l.lesson_id, l.title, l.lesson_order,
                   COALESCE(p.status, 'not_started') as status,
                   p.completed_at
            FROM lessons l
            LEFT JOIN progress p ON l.lesson_id = p.lesson_id AND p.user_id = ?
            WHERE l.course_id = ?
            ORDER BY l.lesson_order ASC
        `, [userId, courseId]);

        // Calculate completion percentage
        const totalLessons = lessons.length;
        const completedLessons = lessons.filter(l => l.status === 'completed').length;
        const completionPercentage = totalLessons > 0 
            ? Math.round((completedLessons / totalLessons) * 100) 
            : 0;

        res.json({
            course_id: parseInt(courseId),
            lessons: lessons,
            total_lessons: totalLessons,
            completed_lessons: completedLessons,
            completion_percentage: completionPercentage
        });

    } catch (error) {
        console.error('Get course progress error:', error);
        res.status(500).json({
            error: 'Failed to get progress',
            message: 'An error occurred while fetching course progress.'
        });
    }
});

// ============================================================
// POST /api/progress/:lessonId
// Update progress for a specific lesson
// Body: { status: "not_started" | "in_progress" | "completed" }
// ============================================================
router.post('/:lessonId', async (req, res) => {
    try {
        const lessonId = req.params.lessonId;
        const userId = req.user.user_id;
        const { status } = req.body;

        // Validate status
        const validStatuses = ['not_started', 'in_progress', 'completed'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Invalid status',
                message: 'Status must be: not_started, in_progress, or completed.'
            });
        }

        // Check if lesson exists
        const [lessons] = await pool.query(
            'SELECT lesson_id, course_id FROM lessons WHERE lesson_id = ?',
            [lessonId]
        );

        if (lessons.length === 0) {
            return res.status(404).json({
                error: 'Lesson not found',
                message: 'The specified lesson does not exist.'
            });
        }

        // Set completed_at timestamp if marking as completed
        const completedAt = status === 'completed' ? new Date() : null;

        // Insert or update progress (upsert)
        await pool.query(`
            INSERT INTO progress (user_id, lesson_id, status, completed_at)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                status = VALUES(status),
                completed_at = VALUES(completed_at)
        `, [userId, lessonId, status, completedAt]);

        res.json({
            message: `Lesson progress updated to "${status}"!`,
            progress: {
                lesson_id: parseInt(lessonId),
                status: status,
                completed_at: completedAt
            }
        });

    } catch (error) {
        console.error('Update progress error:', error);
        res.status(500).json({
            error: 'Failed to update progress',
            message: 'An error occurred while updating your progress.'
        });
    }
});

module.exports = router;
