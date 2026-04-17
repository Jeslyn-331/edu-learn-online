// ============================================================
// Course Routes
// CRUD operations for courses
// GET    /api/courses          - List all published courses
// GET    /api/courses/:id      - Get course details with lessons
// POST   /api/courses          - Create new course (instructor)
// PUT    /api/courses/:id      - Update course (instructor)
// DELETE /api/courses/:id      - Delete course (instructor)
// ============================================================

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { verifyToken, isInstructor, optionalAuth } = require('../middleware/auth');

// ============================================================
// GET /api/courses
// List all published courses (public access)
// Supports search query: ?search=keyword
// ============================================================
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        
        let query = `
            SELECT c.*, u.name as instructor_name,
                   COUNT(DISTINCT e.enrollment_id) as student_count,
                   COUNT(DISTINCT l.lesson_id) as lesson_count
            FROM courses c
            JOIN users u ON c.instructor_id = u.user_id
            LEFT JOIN enrollments e ON c.course_id = e.course_id
            LEFT JOIN lessons l ON c.course_id = l.course_id
            WHERE c.is_published = TRUE
        `;
        
        const params = [];
        
        // Add search filter if provided
        if (search) {
            query += ' AND (c.title LIKE ? OR c.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        query += ' GROUP BY c.course_id ORDER BY c.created_at DESC';

        const [courses] = await pool.query(query, params);

        // Convert decimal strings to numbers
        courses.forEach(course => {
            course.price = parseFloat(course.price);
        });

        res.json({ courses });

    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({
            error: 'Failed to fetch courses',
            message: 'An error occurred while fetching courses.'
        });
    }
});

// ============================================================
// GET /api/courses/:id
// Get single course details with its lessons
// Public access, but shows purchase status if logged in
// Works on both local WAMP and AWS RDS
// ============================================================
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const courseId = req.params.id;

        // Validate course ID is a valid number to prevent bad queries
        if (!courseId || isNaN(courseId)) {
            return res.status(400).json({
                error: 'Invalid course ID',
                message: 'Course ID must be a valid number.'
            });
        }

        // Get course details with instructor info
        const [courses] = await pool.query(`
            SELECT c.*, u.name as instructor_name,
                   COUNT(DISTINCT e.enrollment_id) as student_count
            FROM courses c
            JOIN users u ON c.instructor_id = u.user_id
            LEFT JOIN enrollments e ON c.course_id = e.course_id
            WHERE c.course_id = ?
            GROUP BY c.course_id
        `, [courseId]);

        if (courses.length === 0) {
            return res.status(404).json({
                error: 'Course not found',
                message: 'The requested course does not exist.'
            });
        }

        const course = courses[0];
        course.price = parseFloat(course.price);

        // Get lessons for this course
        // Uses SELECT l.* so new columns are included automatically
        const [lessons] = await pool.query(`
            SELECT l.*
            FROM lessons l
            WHERE l.course_id = ?
            ORDER BY l.lesson_order ASC
        `, [courseId]);

        lessons.forEach(lesson => {
            lesson.price = parseFloat(lesson.price);
        });

        // Check if user has purchased this course (if logged in)
        let isPurchased = false;
        let purchasedLessons = [];
        
        if (req.user) {
            // Check course purchase
            const [coursePurchase] = await pool.query(
                'SELECT purchase_id FROM purchases WHERE user_id = ? AND course_id = ?',
                [req.user.user_id, courseId]
            );
            isPurchased = coursePurchase.length > 0;

            // Check individual lesson purchases
            const [lessonPurchases] = await pool.query(
                'SELECT lesson_id FROM purchases WHERE user_id = ? AND lesson_id IS NOT NULL AND course_id IS NULL',
                [req.user.user_id]
            );
            purchasedLessons = lessonPurchases.map(p => p.lesson_id);
        }

        res.json({
            course: {
                ...course,
                lessons: lessons,
                is_purchased: isPurchased,
                purchased_lessons: purchasedLessons
            }
        });

    } catch (error) {
        console.error('Get course details error:', error);
        // Return actual error detail so frontend can show useful message
        const detail = error.sqlMessage || error.message || 'Unknown error';
        res.status(500).json({
            error: 'Failed to fetch course',
            message: `Failed to load course details: ${detail}`
        });
    }
});

// ============================================================
// POST /api/courses
// Create a new course (instructors only)
// ============================================================
router.post('/', verifyToken, isInstructor, async (req, res) => {
    try {
        const { title, description, price, image_url, is_published, duration } = req.body;

        // Validate required fields
        if (!title) {
            return res.status(400).json({
                error: 'Missing fields',
                message: 'Course title is required.'
            });
        }

        // Validate price
        const coursePrice = parseFloat(price) || 0;
        if (coursePrice < 0) {
            return res.status(400).json({
                error: 'Invalid price',
                message: 'Price cannot be negative.'
            });
        }

        // Parse duration (in hours, optional)
        const courseDuration = duration ? parseInt(duration) : null;

        // Insert course into database
        const [result] = await pool.query(
            `INSERT INTO courses (title, description, price, image_url, instructor_id, is_published, duration) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [title, description || '', coursePrice, image_url || null, req.user.user_id, is_published || false, courseDuration]
        );

        res.status(201).json({
            message: 'Course created successfully!',
            course: {
                course_id: result.insertId,
                title,
                description: description || '',
                price: coursePrice,
                image_url: image_url || null,
                instructor_id: req.user.user_id,
                is_published: is_published || false,
                duration: courseDuration
            }
        });

    } catch (error) {
        console.error('Create course error:', error);
        res.status(500).json({
            error: 'Failed to create course',
            message: 'An error occurred while creating the course.'
        });
    }
});

// ============================================================
// PUT /api/courses/:id
// Update an existing course (owner instructor only)
// ============================================================
router.put('/:id', verifyToken, isInstructor, async (req, res) => {
    try {
        const courseId = req.params.id;
        const { title, description, price, image_url, is_published, duration } = req.body;

        // Check if course exists and belongs to this instructor
        const [courses] = await pool.query(
            'SELECT * FROM courses WHERE course_id = ?',
            [courseId]
        );

        if (courses.length === 0) {
            return res.status(404).json({
                error: 'Course not found',
                message: 'The requested course does not exist.'
            });
        }

        // Only the course owner or admin can update
        if (courses[0].instructor_id !== req.user.user_id && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'You can only update your own courses.'
            });
        }

        // Build update query dynamically (only update provided fields)
        const updates = [];
        const params = [];

        if (title !== undefined) { updates.push('title = ?'); params.push(title); }
        if (description !== undefined) { updates.push('description = ?'); params.push(description); }
        if (price !== undefined) { updates.push('price = ?'); params.push(parseFloat(price)); }
        if (image_url !== undefined) { updates.push('image_url = ?'); params.push(image_url); }
        if (is_published !== undefined) { updates.push('is_published = ?'); params.push(is_published); }
        if (duration !== undefined) { updates.push('duration = ?'); params.push(duration ? parseInt(duration) : null); }

        if (updates.length === 0) {
            return res.status(400).json({
                error: 'No updates',
                message: 'No fields to update were provided.'
            });
        }

        params.push(courseId);
        await pool.query(
            `UPDATE courses SET ${updates.join(', ')} WHERE course_id = ?`,
            params
        );

        // Fetch updated course
        const [updatedCourse] = await pool.query(
            'SELECT * FROM courses WHERE course_id = ?',
            [courseId]
        );

        updatedCourse[0].price = parseFloat(updatedCourse[0].price);

        res.json({
            message: 'Course updated successfully!',
            course: updatedCourse[0]
        });

    } catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({
            error: 'Failed to update course',
            message: 'An error occurred while updating the course.'
        });
    }
});

// ============================================================
// DELETE /api/courses/:id
// Delete a course (owner instructor only)
// ============================================================
router.delete('/:id', verifyToken, isInstructor, async (req, res) => {
    try {
        const courseId = req.params.id;

        // Check if course exists and belongs to this instructor
        const [courses] = await pool.query(
            'SELECT * FROM courses WHERE course_id = ?',
            [courseId]
        );

        if (courses.length === 0) {
            return res.status(404).json({
                error: 'Course not found',
                message: 'The requested course does not exist.'
            });
        }

        // Only the course owner or admin can delete
        if (courses[0].instructor_id !== req.user.user_id && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'You can only delete your own courses.'
            });
        }

        // Delete course (cascades to lessons, enrollments, etc.)
        await pool.query('DELETE FROM courses WHERE course_id = ?', [courseId]);

        res.json({
            message: 'Course deleted successfully!',
            course_id: parseInt(courseId)
        });

    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({
            error: 'Failed to delete course',
            message: 'An error occurred while deleting the course.'
        });
    }
});

module.exports = router;
