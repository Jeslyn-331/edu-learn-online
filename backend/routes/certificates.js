// ============================================================
// Certificate Routes
// Generate and manage course completion certificates
// POST /api/certificates/generate/:courseId - Generate certificate
// GET  /api/certificates                    - Get all user certificates
// GET  /api/certificates/:id                - Get single certificate
// GET  /api/certificates/verify/:code       - Verify certificate by code
// ============================================================

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const crypto = require('crypto');

// ============================================================
// HELPER: Generate a unique certificate code
// Format: CERT-YYYY-XXXXXXXX (e.g., CERT-2026-A3F8B2C1)
// ============================================================
function generateCertificateCode() {
    const year = new Date().getFullYear();
    const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `CERT-${year}-${randomPart}`;
}

// ============================================================
// HELPER: Check if user completed ALL lessons in a course
// Returns { completed: true/false, totalLessons, completedLessons }
// ============================================================
async function checkCourseCompletion(userId, courseId) {
    // Step 1: Get total number of lessons in the course
    const [lessons] = await pool.query(
        'SELECT COUNT(*) as total FROM lessons WHERE course_id = ?',
        [courseId]
    );
    const totalLessons = lessons[0].total;

    // If course has no lessons, it can't be completed
    if (totalLessons === 0) {
        return { completed: false, totalLessons: 0, completedLessons: 0 };
    }

    // Step 2: Count how many lessons the user has completed
    const [completed] = await pool.query(`
        SELECT COUNT(*) as total 
        FROM progress p
        JOIN lessons l ON p.lesson_id = l.lesson_id
        WHERE p.user_id = ? 
          AND l.course_id = ? 
          AND p.status = 'completed'
    `, [userId, courseId]);
    const completedLessons = completed[0].total;

    // Step 3: Compare - all lessons must be completed
    return {
        completed: completedLessons >= totalLessons,
        totalLessons,
        completedLessons
    };
}

// ============================================================
// POST /api/certificates/generate/:courseId
// Generate a certificate after completing all lessons
// ============================================================
router.post('/generate/:courseId', verifyToken, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const courseId = req.params.courseId;

        // Step 1: Check if course exists
        const [courses] = await pool.query(`
            SELECT c.course_id, c.title, u.name as instructor_name
            FROM courses c
            JOIN users u ON c.instructor_id = u.user_id
            WHERE c.course_id = ?
        `, [courseId]);

        if (courses.length === 0) {
            return res.status(404).json({
                error: 'Course not found',
                message: 'The specified course does not exist.'
            });
        }

        // Step 2: Check if certificate already exists
        const [existing] = await pool.query(
            'SELECT * FROM certificates WHERE user_id = ? AND course_id = ?',
            [userId, courseId]
        );

        if (existing.length > 0) {
            // Certificate already issued - return it
            return res.json({
                message: 'Certificate already issued!',
                certificate: existing[0]
            });
        }

        // Step 3: Verify the user completed ALL lessons
        const completion = await checkCourseCompletion(userId, courseId);

        if (!completion.completed) {
            return res.status(400).json({
                error: 'Course not completed',
                message: `You have completed ${completion.completedLessons} out of ${completion.totalLessons} lessons. Complete all lessons to earn your certificate.`,
                progress: completion
            });
        }

        // Step 4: Generate unique certificate code
        let certificateCode = generateCertificateCode();
        
        // Make sure code is unique (very unlikely to collide, but just in case)
        const [codeCheck] = await pool.query(
            'SELECT certificate_id FROM certificates WHERE certificate_code = ?',
            [certificateCode]
        );
        if (codeCheck.length > 0) {
            certificateCode = generateCertificateCode(); // Try again
        }

        // Step 5: Insert certificate record into database
        const [result] = await pool.query(`
            INSERT INTO certificates (user_id, course_id, certificate_code)
            VALUES (?, ?, ?)
        `, [userId, courseId, certificateCode]);

        // Step 6: Fetch the complete certificate data
        const [certificate] = await pool.query(`
            SELECT cert.*, 
                   c.title as course_title,
                   u.name as user_name,
                   inst.name as instructor_name
            FROM certificates cert
            JOIN courses c ON cert.course_id = c.course_id
            JOIN users u ON cert.user_id = u.user_id
            JOIN users inst ON c.instructor_id = inst.user_id
            WHERE cert.certificate_id = ?
        `, [result.insertId]);

        res.status(201).json({
            message: '🎉 Congratulations! Your certificate has been generated!',
            certificate: certificate[0]
        });

    } catch (error) {
        console.error('Generate certificate error:', error);
        res.status(500).json({
            error: 'Failed to generate certificate',
            message: 'An error occurred while generating your certificate.'
        });
    }
});

// ============================================================
// GET /api/certificates
// Get all certificates for the logged-in user
// ============================================================
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.user_id;

        const [certificates] = await pool.query(`
            SELECT cert.certificate_id, cert.certificate_code, cert.issue_date, cert.file_url,
                   c.course_id, c.title as course_title, c.description as course_description,
                   u.name as user_name,
                   inst.name as instructor_name
            FROM certificates cert
            JOIN courses c ON cert.course_id = c.course_id
            JOIN users u ON cert.user_id = u.user_id
            JOIN users inst ON c.instructor_id = inst.user_id
            WHERE cert.user_id = ?
            ORDER BY cert.issue_date DESC
        `, [userId]);

        res.json({ certificates });

    } catch (error) {
        console.error('Get certificates error:', error);
        res.status(500).json({
            error: 'Failed to get certificates',
            message: 'An error occurred while fetching your certificates.'
        });
    }
});

// ============================================================
// GET /api/certificates/check/:courseId
// Check if user can get a certificate for a course
// (checks completion status without generating)
// ============================================================
router.get('/check/:courseId', verifyToken, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const courseId = req.params.courseId;

        // Check completion
        const completion = await checkCourseCompletion(userId, courseId);

        // Check if certificate already exists
        const [existing] = await pool.query(
            'SELECT * FROM certificates WHERE user_id = ? AND course_id = ?',
            [userId, courseId]
        );

        res.json({
            course_id: parseInt(courseId),
            is_completed: completion.completed,
            total_lessons: completion.totalLessons,
            completed_lessons: completion.completedLessons,
            has_certificate: existing.length > 0,
            certificate: existing.length > 0 ? existing[0] : null
        });

    } catch (error) {
        console.error('Check certificate error:', error);
        res.status(500).json({
            error: 'Failed to check certificate status',
            message: 'An error occurred.'
        });
    }
});

// ============================================================
// GET /api/certificates/verify/:code
// Public endpoint - verify a certificate by its unique code
// Anyone can verify if a certificate is real
// ============================================================
router.get('/verify/:code', async (req, res) => {
    try {
        const code = req.params.code;

        const [certificates] = await pool.query(`
            SELECT cert.certificate_id, cert.certificate_code, cert.issue_date,
                   c.title as course_title,
                   u.name as user_name,
                   inst.name as instructor_name
            FROM certificates cert
            JOIN courses c ON cert.course_id = c.course_id
            JOIN users u ON cert.user_id = u.user_id
            JOIN users inst ON c.instructor_id = inst.user_id
            WHERE cert.certificate_code = ?
        `, [code]);

        if (certificates.length === 0) {
            return res.status(404).json({
                valid: false,
                message: 'Certificate not found. This code is invalid.'
            });
        }

        res.json({
            valid: true,
            message: 'This is a valid EduLearn certificate!',
            certificate: certificates[0]
        });

    } catch (error) {
        console.error('Verify certificate error:', error);
        res.status(500).json({
            error: 'Verification failed',
            message: 'An error occurred during verification.'
        });
    }
});

// ============================================================
// GET /api/certificates/:id
// Get a single certificate by ID (for viewing/downloading)
// ============================================================
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const certId = req.params.id;
        const userId = req.user.user_id;

        const [certificates] = await pool.query(`
            SELECT cert.*, 
                   c.title as course_title, c.description as course_description,
                   u.name as user_name, u.email as user_email,
                   inst.name as instructor_name
            FROM certificates cert
            JOIN courses c ON cert.course_id = c.course_id
            JOIN users u ON cert.user_id = u.user_id
            JOIN users inst ON c.instructor_id = inst.user_id
            WHERE cert.certificate_id = ? AND cert.user_id = ?
        `, [certId, userId]);

        if (certificates.length === 0) {
            return res.status(404).json({
                error: 'Certificate not found',
                message: 'Certificate not found or you do not have access.'
            });
        }

        res.json({ certificate: certificates[0] });

    } catch (error) {
        console.error('Get certificate error:', error);
        res.status(500).json({
            error: 'Failed to get certificate',
            message: 'An error occurred.'
        });
    }
});

module.exports = router;
