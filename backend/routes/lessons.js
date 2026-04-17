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
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const { pool } = require('../config/database');
const { verifyToken, isInstructor, optionalAuth } = require('../middleware/auth');
const { isS3Enabled, uploadToS3, deleteFromS3, isS3Url } = require('../config/s3');

const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;
const lessonUploadsDir = path.join(__dirname, '..', 'uploads', 'lessons');

// Make sure the local uploads directory exists before saving files.
fs.mkdirSync(lessonUploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, lessonUploadsDir),
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '');
        cb(null, `${Date.now()}-${safeName}`);
    }
});

const uploadLessonVideo = multer({
    storage,
    limits: {
        fileSize: MAX_VIDEO_SIZE_BYTES
    },
    fileFilter: (req, file, cb) => {
        const isMp4Mime = file.mimetype === 'video/mp4';
        const isMp4Extension = path.extname(file.originalname).toLowerCase() === '.mp4';

        if (!isMp4Mime || !isMp4Extension) {
            return cb(new Error('Only MP4 video files are allowed.'));
        }

        cb(null, true);
    }
}).single('video_file');

const handleLessonUpload = (req, res, next) => {
    uploadLessonVideo(req, res, (error) => {
        if (!error) {
            return next();
        }

        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File too large',
                message: 'Lesson video must be 50MB or smaller.'
            });
        }

        return res.status(400).json({
            error: 'Invalid upload',
            message: error.message || 'Lesson video upload failed.'
        });
    });
};

// Normalize lesson URLs so browsers always receive an absolute link.
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

const parseBoolean = (value) => value === true || value === 'true' || value === 1 || value === '1';

const toPublicUploadPath = (file) => file ? `/uploads/lessons/${file.filename}` : null;

// Upload the multer-saved local file to S3 (if configured).
// Returns the S3 URL, or falls back to the local path.
const uploadVideoToStorage = async (file) => {
    if (!file) return null;

    const localPath = toPublicUploadPath(file);

    // If S3 is configured, upload there and remove the local temp file
    if (isS3Enabled()) {
        try {
            const s3Key = `lessons/${file.filename}`;
            const absoluteLocal = path.join(lessonUploadsDir, file.filename);
            const s3Url = await uploadToS3(absoluteLocal, s3Key, 'video/mp4');

            // Remove local temp file after successful S3 upload
            await fs.promises.unlink(absoluteLocal).catch(() => {});
            return s3Url;
        } catch (err) {
            console.error('S3 upload failed, keeping local file:', err.message);
            return localPath; // Fallback to local storage
        }
    }

    return localPath;
};

// Delete a video from wherever it is stored (local or S3)
const deleteVideo = async (videoPath) => {
    if (!videoPath) return;

    if (isS3Url(videoPath)) {
        await deleteFromS3(videoPath);
    } else {
        await deleteLocalVideo(videoPath);
    }
};

const deleteLocalVideo = async (videoPath) => {
    if (!videoPath || !videoPath.startsWith('/uploads/lessons/')) {
        return;
    }

    const absolutePath = path.join(__dirname, '..', videoPath.replace(/^\//, ''));

    try {
        await fs.promises.unlink(absolutePath);
    } catch (error) {
        // Ignore missing-file errors so cleanup never blocks a request.
        if (error.code !== 'ENOENT') {
            console.error('Failed to delete old lesson video:', error.message);
        }
    }
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

        lessons.forEach((lesson) => {
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

        let hasAccess = lesson.is_preview;

        if (req.user && !hasAccess) {
            const [lessonPurchase] = await pool.query(
                'SELECT purchase_id FROM purchases WHERE user_id = ? AND lesson_id = ?',
                [req.user.user_id, lessonId]
            );

            const [coursePurchase] = await pool.query(
                'SELECT purchase_id FROM purchases WHERE user_id = ? AND course_id = ?',
                [req.user.user_id, lesson.course_id]
            );

            hasAccess = lessonPurchase.length > 0 ||
                coursePurchase.length > 0 ||
                lesson.instructor_id === req.user.user_id;
        }

        // Hide both media sources when the learner does not have access.
        if (!hasAccess) {
            lesson.video_url = null;
            lesson.video_file = null;
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
// Accepts either a video URL or an uploaded MP4 file
// ============================================================
router.post('/', verifyToken, isInstructor, handleLessonUpload, async (req, res) => {
    try {
        const {
            course_id,
            title,
            content,
            video_url,
            price,
            lesson_order,
            is_preview
        } = req.body;

        const normalizedVideoUrl = normalizeLessonUrl(video_url);
        // Upload to S3 if configured, otherwise keep local path
        const uploadedVideoPath = await uploadVideoToStorage(req.file);

        if (!course_id || !title) {
            if (uploadedVideoPath) {
                await deleteVideo(uploadedVideoPath);
            }

            return res.status(400).json({
                error: 'Missing fields',
                message: 'Course ID and lesson title are required.'
            });
        }

        if (normalizedVideoUrl && uploadedVideoPath) {
            await deleteVideo(uploadedVideoPath);
            return res.status(400).json({
                error: 'Invalid lesson media',
                message: 'Please provide either a video URL or an MP4 upload, not both.'
            });
        }

        if (!normalizedVideoUrl && !uploadedVideoPath) {
            return res.status(400).json({
                error: 'Missing video',
                message: 'Please provide a video URL or upload an MP4 file.'
            });
        }

        const [courses] = await pool.query(
            'SELECT instructor_id FROM courses WHERE course_id = ?',
            [course_id]
        );

        if (courses.length === 0) {
            if (uploadedVideoPath) {
                await deleteVideo(uploadedVideoPath);
            }

            return res.status(404).json({
                error: 'Course not found',
                message: 'The specified course does not exist.'
            });
        }

        if (courses[0].instructor_id !== req.user.user_id && req.user.role !== 'admin') {
            if (uploadedVideoPath) {
                await deleteVideo(uploadedVideoPath);
            }

            return res.status(403).json({
                error: 'Access denied',
                message: 'You can only add lessons to your own courses.'
            });
        }

        let order = lesson_order;
        if (!order) {
            const [maxOrder] = await pool.query(
                'SELECT MAX(lesson_order) as max_order FROM lessons WHERE course_id = ?',
                [course_id]
            );
            order = (maxOrder[0].max_order || 0) + 1;
        }

        const lessonPrice = parseFloat(price) || 0;
        const previewValue = parseBoolean(is_preview);

        const [result] = await pool.query(
            `INSERT INTO lessons (
                course_id, title, content, video_url, video_file, price, lesson_order, is_preview
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                parseInt(course_id),
                title,
                content || '',
                normalizedVideoUrl,
                uploadedVideoPath,
                lessonPrice,
                parseInt(order),
                previewValue
            ]
        );

        res.status(201).json({
            message: 'Lesson created successfully!',
            lesson: {
                lesson_id: result.insertId,
                course_id: parseInt(course_id),
                title,
                content: content || '',
                video_url: normalizedVideoUrl,
                video_file: uploadedVideoPath,
                price: lessonPrice,
                lesson_order: parseInt(order),
                is_preview: previewValue
            }
        });
    } catch (error) {
        if (req.file) {
            // Clean up: try local first, then S3 if applicable
            const tempPath = toPublicUploadPath(req.file);
            await deleteVideo(tempPath);
        }

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
// Supports switching between URL video and uploaded MP4
// ============================================================
router.put('/:id', verifyToken, isInstructor, handleLessonUpload, async (req, res) => {
    try {
        const lessonId = req.params.id;
        const {
            title,
            content,
            video_url,
            price,
            lesson_order,
            is_preview,
            keep_existing_video_file
        } = req.body;

        const [lessons] = await pool.query(`
            SELECT l.*, c.instructor_id
            FROM lessons l
            JOIN courses c ON l.course_id = c.course_id
            WHERE l.lesson_id = ?
        `, [lessonId]);

        if (lessons.length === 0) {
            if (req.file) {
                await deleteLocalVideo(toPublicUploadPath(req.file));
            }

            return res.status(404).json({
                error: 'Lesson not found',
                message: 'The requested lesson does not exist.'
            });
        }

        const currentLesson = lessons[0];

        if (currentLesson.instructor_id !== req.user.user_id && req.user.role !== 'admin') {
            if (req.file) {
                await deleteLocalVideo(toPublicUploadPath(req.file));
            }

            return res.status(403).json({
                error: 'Access denied',
                message: 'You can only update lessons in your own courses.'
            });
        }

        const normalizedVideoUrl = normalizeLessonUrl(video_url);
        // Upload new file to S3 if configured, otherwise keep local
        const uploadedVideoPath = await uploadVideoToStorage(req.file);
        const keepExistingVideoFile = parseBoolean(keep_existing_video_file);

        if (normalizedVideoUrl && uploadedVideoPath) {
            await deleteVideo(uploadedVideoPath);
            return res.status(400).json({
                error: 'Invalid lesson media',
                message: 'Please provide either a video URL or an MP4 upload, not both.'
            });
        }

        let nextVideoUrl = currentLesson.video_url;
        let nextVideoFile = currentLesson.video_file;

        if (uploadedVideoPath) {
            nextVideoUrl = null;
            nextVideoFile = uploadedVideoPath;
        } else if (normalizedVideoUrl !== undefined) {
            nextVideoUrl = normalizedVideoUrl;
            nextVideoFile = normalizedVideoUrl ? null : (keepExistingVideoFile ? currentLesson.video_file : null);
        } else if (keepExistingVideoFile) {
            nextVideoUrl = null;
            nextVideoFile = currentLesson.video_file;
        }

        if (!nextVideoUrl && !nextVideoFile) {
            if (uploadedVideoPath) {
                await deleteVideo(uploadedVideoPath);
            }

            return res.status(400).json({
                error: 'Missing video',
                message: 'Please provide a video URL or upload an MP4 file.'
            });
        }

        const nextLesson = {
            title: title !== undefined ? title : currentLesson.title,
            content: content !== undefined ? content : currentLesson.content,
            video_url: nextVideoUrl,
            video_file: nextVideoFile,
            price: price !== undefined ? (parseFloat(price) || 0) : parseFloat(currentLesson.price),
            lesson_order: lesson_order !== undefined ? parseInt(lesson_order) : currentLesson.lesson_order,
            is_preview: is_preview !== undefined ? parseBoolean(is_preview) : currentLesson.is_preview
        };

        await pool.query(
            `UPDATE lessons
             SET title = ?, content = ?, video_url = ?, video_file = ?, price = ?, lesson_order = ?, is_preview = ?
             WHERE lesson_id = ?`,
            [
                nextLesson.title,
                nextLesson.content,
                nextLesson.video_url,
                nextLesson.video_file,
                nextLesson.price,
                nextLesson.lesson_order,
                nextLesson.is_preview,
                lessonId
            ]
        );

        // Remove the old video (local or S3) after the new database state is safely saved.
        if (currentLesson.video_file && currentLesson.video_file !== nextLesson.video_file) {
            await deleteVideo(currentLesson.video_file);
        }

        res.json({
            message: 'Lesson updated successfully!',
            lesson: {
                ...currentLesson,
                ...nextLesson,
                lesson_id: parseInt(lessonId),
                price: nextLesson.price
            }
        });
    } catch (error) {
        if (req.file) {
            const tempPath = toPublicUploadPath(req.file);
            await deleteVideo(tempPath);
        }

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

        const lesson = lessons[0];

        if (lesson.instructor_id !== req.user.user_id && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'You can only delete lessons in your own courses.'
            });
        }

        await pool.query('DELETE FROM lessons WHERE lesson_id = ?', [lessonId]);
        // Clean up the video file from local storage or S3
        await deleteVideo(lesson.video_file);

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
