// ============================================================
// Lesson Routes
// CRUD operations for lessons within courses
// GET    /api/lessons/course/:courseId - Get lessons for a course
// GET    /api/lessons/:id             - Get single lesson
// POST   /api/lessons                 - Create lesson (instructor)
// PUT    /api/lessons/:id             - Update lesson (instructor)
// DELETE /api/lessons/:id             - Delete lesson (instructor)
// ============================================================

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { verifyToken, isInstructor, optionalAuth } = require('../middleware/auth');

// Normalize lesson URLs so browsers always receive an absolute link.
// This fixes common admin input like "www.example.com/video" without a protocol.
const normalizeLessonUrl = (rawUrl) => {
    if (rawUrl === undefined) {
        return undefined;
    }

    const trimmedUrl = typeof rawUrl === 'string' ? rawUrl.trim() : '';
    if (!trimmedUrl) {
        return null;
    }

    if (/^https?:\/\//i.test(trimmedUrl)) {
        return trimmedUrl;
    }

    return `https://${trimmedUrl}`;
};

// ============================================================
// GET /api/lessons/course/:courseId
// Get all lessons for a specific course
// ============================================================
router.get('/course/:courseId', async (req, res) => {
    try {
        const courseId = req.params.courseId;

        const [lessons] = await pool.query(`
            SELECT l.*, c.title as course_title
            FROM lessons l
            JOIN courses c ON l.course_id = c.course_id
            WHERE l.course_id = ?
            ORDER BY l.lesson_order ASC
        `, [courseId]);

        lessons.forEach(lesson => {
            lesson.price = parseFloat(lesson.price);
        });

        res.json({ lessons });

    } catch (error) {
        console.error('Get lessons error:', error);
        res.status(500).json({
            error: 'Failed to fetch lessons',
            message: 'An error occurred while fetching lessons.'
        });
    }
});

// ============================================================
// GET /api/lessons/:id
// Get single lesson details
// Shows full content only if user has purchased it or it's a preview
// ============================================================
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const lessonId = req.params.id;

        // Get lesson with course info
        const [lessons] = await pool.query(`
            SELECT l.*, c.title as course_title, c.instructor_id, c.course_id
            FROM lessons l
            JOIN courses c ON l.course_id = c.course_id
            WHERE l.lesson_id = ?
        `, [lessonId]);

        if (lessons.length === 0) {
            return res.status(404).json({
                error: 'Lesson not found',
                message: 'The requested lesson does not exist.'
            });
        }

        const lesson = lessons[0];
        lesson.price = parseFloat(lesson.price);

        // Check access: preview lessons are always accessible
        let hasAccess = lesson.is_preview;

        if (req.user && !hasAccess) {
            // Check if user purchased this specific lesson
            const [lessonPurchase] = await pool.query(
                'SELECT purchase_id FROM purchases WHERE user_id = ? AND lesson_id = ?',
                [req.user.user_id, lessonId]
            );

            // Check if user purchased the full course
            const [coursePurchase] = await pool.query(
                'SELECT purchase_id FROM purchases WHERE user_id = ? AND course_id = ?',
                [req.user.user_id, lesson.course_id]
            );

            // Check if user is the instructor
            hasAccess = lessonPurchase.length > 0 || 
                       coursePurchase.length > 0 || 
                       lesson.instructor_id === req.user.user_id;
        }

        // If no access, hide video URL and full content
        if (!hasAccess) {
            lesson.video_url = null;
            lesson.content = lesson.content ? lesson.content.substring(0, 100) + '...' : null;
        }

        res.json({
            lesson: {
                ...lesson,
                has_access: hasAccess
            }
        });

    } catch (error) {
        console.error('Get lesson error:', error);
        res.status(500).json({
            error: 'Failed to fetch lesson',
            message: 'An error occurred while fetching lesson details.'
        });
    }
});

// ============================================================
// POST /api/lessons
// Create a new lesson (instructor only)
// ============================================================
router.post('/', verifyToken, isInstructor, async (req, res) => {
    try {
        const { course_id, title, content, video_url, price, lesson_order, is_preview } = req.body;
        const normalizedVideoUrl = normalizeLessonUrl(video_url);

        // Validate required fields
        if (!course_id || !title) {
            return res.status(400).json({
                error: 'Missing fields',
                message: 'Course ID and lesson title are required.'
            });
        }

        // Verify the course belongs to this instructor
        const [courses] = await pool.query(
            'SELECT instructor_id FROM courses WHERE course_id = ?',
            [course_id]
        );

        if (courses.length === 0) {
            return res.status(404).json({
                error: 'Course not found',
                message: 'The specified course does not exist.'
            });
        }

        if (courses[0].instructor_id !== req.user.user_id && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'You can only add lessons to your own courses.'
            });
        }

        // Get the next lesson order if not provided
        let order = lesson_order;
        if (!order) {
            const [maxOrder] = await pool.query(
                'SELECT MAX(lesson_order) as max_order FROM lessons WHERE course_id = ?',
                [course_id]
            );
            order = (maxOrder[0].max_order || 0) + 1;
        }

        const lessonPrice = parseFloat(price) || 0;

        // Insert lesson
        const [result] = await pool.query(
            `INSERT INTO lessons (course_id, title, content, video_url, price, lesson_order, is_preview) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [course_id, title, content || '', normalizedVideoUrl, lessonPrice, order, is_preview || false]
        );

        res.status(201).json({
            message: 'Lesson created successfully!',
            lesson: {
                lesson_id: result.insertId,
                course_id: parseInt(course_id),
                title,
                content: content || '',
                video_url: normalizedVideoUrl,
                price: lessonPrice,
                lesson_order: order,
                is_preview: is_preview || false
            }
        });

    } catch (error) {
        console.error('Create lesson error:', error);
        res.status(500).json({
            error: 'Failed to create lesson',
            message: 'An error occurred while creating the lesson.'
        });
    }
});

// ============================================================
// PUT /api/lessons/:id
// Update an existing lesson (owner instructor only)
// ============================================================
router.put('/:id', verifyToken, isInstructor, async (req, res) => {
    try {
        const lessonId = req.params.id;
        const { title, content, video_url, price, lesson_order, is_preview } = req.body;
        const normalizedVideoUrl = normalizeLessonUrl(video_url);

        // Get lesson and verify ownership
        const [lessons] = await pool.query(`
            SELECT l.*, c.instructor_id 
            FROM lessons l 
            JOIN courses c ON l.course_id = c.course_id 
            WHERE l.lesson_id = ?
        `, [lessonId]);

        if (lessons.length === 0) {
            return res.status(404).json({
                error: 'Lesson not found',
                message: 'The requested lesson does not exist.'
            });
        }

        if (lessons[0].instructor_id !== req.user.user_id && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'You can only update lessons in your own courses.'
            });
        }

        // Build update query
        const updates = [];
        const params = [];

        if (title !== undefined) { updates.push('title = ?'); params.push(title); }
        if (content !== undefined) { updates.push('content = ?'); params.push(content); }
        if (video_url !== undefined) { updates.push('video_url = ?'); params.push(normalizedVideoUrl); }
        if (price !== undefined) { updates.push('price = ?'); params.push(parseFloat(price)); }
        if (lesson_order !== undefined) { updates.push('lesson_order = ?'); params.push(lesson_order); }
        if (is_preview !== undefined) { updates.push('is_preview = ?'); params.push(is_preview); }

        if (updates.length === 0) {
            return res.status(400).json({
                error: 'No updates',
                message: 'No fields to update were provided.'
            });
        }

        params.push(lessonId);
        await pool.query(
            `UPDATE lessons SET ${updates.join(', ')} WHERE lesson_id = ?`,
            params
        );

        // Fetch updated lesson
        const [updatedLesson] = await pool.query(
            'SELECT * FROM lessons WHERE lesson_id = ?',
            [lessonId]
        );

        updatedLesson[0].price = parseFloat(updatedLesson[0].price);

        res.json({
            message: 'Lesson updated successfully!',
            lesson: updatedLesson[0]
        });

    } catch (error) {
        console.error('Update lesson error:', error);
        res.status(500).json({
            error: 'Failed to update lesson',
            message: 'An error occurred while updating the lesson.'
        });
    }
});

// ============================================================
// DELETE /api/lessons/:id
// Delete a lesson (owner instructor only)
// ============================================================
router.delete('/:id', verifyToken, isInstructor, async (req, res) => {
    try {
        const lessonId = req.params.id;

        // Get lesson and verify ownership
        const [lessons] = await pool.query(`
            SELECT l.*, c.instructor_id 
            FROM lessons l 
            JOIN courses c ON l.course_id = c.course_id 
            WHERE l.lesson_id = ?
        `, [lessonId]);

        if (lessons.length === 0) {
            return res.status(404).json({
                error: 'Lesson not found',
                message: 'The requested lesson does not exist.'
            });
        }

        if (lessons[0].instructor_id !== req.user.user_id && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'You can only delete lessons in your own courses.'
            });
        }

        await pool.query('DELETE FROM lessons WHERE lesson_id = ?', [lessonId]);

        res.json({
            message: 'Lesson deleted successfully!',
            lesson_id: parseInt(lessonId)
        });

    } catch (error) {
        console.error('Delete lesson error:', error);
        res.status(500).json({
            error: 'Failed to delete lesson',
            message: 'An error occurred while deleting the lesson.'
        });
    }
});

module.exports = router;
