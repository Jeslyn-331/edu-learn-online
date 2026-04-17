// ============================================================
// Manage Course Page (Create / Edit)
// Instructors can create new courses or edit existing ones
// Also manage lessons within the course
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseAPI, lessonAPI } from '../services/api';

const normalizeLessonUrl = (rawUrl) => {
    const trimmedUrl = rawUrl.trim();

    if (!trimmedUrl) {
        return '';
    }

    if (/^https?:\/\//i.test(trimmedUrl)) {
        return trimmedUrl;
    }

    return `https://${trimmedUrl}`;
};

function ManageCourse() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [duration, setDuration] = useState('');
    const [isPublished, setIsPublished] = useState(false);
    const [lessons, setLessons] = useState([]);

    const [showLessonForm, setShowLessonForm] = useState(false);
    const [editingLesson, setEditingLesson] = useState(null);
    const [lessonTitle, setLessonTitle] = useState('');
    const [lessonContent, setLessonContent] = useState('');
    const [lessonVideoUrl, setLessonVideoUrl] = useState('');
    const [lessonVideoFile, setLessonVideoFile] = useState(null);
    const [existingVideoFile, setExistingVideoFile] = useState('');
    const [lessonPrice, setLessonPrice] = useState('');
    const [lessonIsPreview, setLessonIsPreview] = useState(false);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (isEditing) {
            fetchCourse();
        }
    }, [id]);

    const fetchCourse = async () => {
        try {
            setLoading(true);
            const response = await courseAPI.getById(id);
            const course = response.data.course;
            setTitle(course.title);
            setDescription(course.description || '');
            setPrice(course.price.toString());
            setDuration(course.duration ? course.duration.toString() : '');
            setIsPublished(course.is_published);
            setLessons(course.lessons || []);
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to load course.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCourse = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (!title.trim()) {
            setMessage({ type: 'error', text: 'Course title is required.' });
            return;
        }

        setSaving(true);
        try {
            const courseData = {
                title: title.trim(),
                description: description.trim(),
                price: parseFloat(price) || 0,
                duration: duration ? parseInt(duration) : null,
                is_published: isPublished
            };

            if (isEditing) {
                await courseAPI.update(id, courseData);
                setMessage({ type: 'success', text: 'Course updated successfully!' });
            } else {
                const response = await courseAPI.create(courseData);
                setMessage({ type: 'success', text: 'Course created successfully!' });
                navigate(`/instructor/course/${response.data.course.course_id}`, { replace: true });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save course.' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCourse = async () => {
        if (!window.confirm('Are you sure you want to delete this course? This cannot be undone.')) {
            return;
        }

        try {
            await courseAPI.delete(id);
            navigate('/instructor');
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to delete course.' });
        }
    };

    const resetLessonForm = () => {
        setLessonTitle('');
        setLessonContent('');
        setLessonVideoUrl('');
        setLessonVideoFile(null);
        setExistingVideoFile('');
        setLessonPrice('');
        setLessonIsPreview(false);
        setEditingLesson(null);
        setShowLessonForm(false);
    };

    const handleVideoUrlChange = (value) => {
        setLessonVideoUrl(value);

        // Switching to URL mode means the existing uploaded file should be replaced.
        if (value.trim()) {
            setExistingVideoFile('');
            setLessonVideoFile(null);
        }
    };

    const handleVideoFileChange = (file) => {
        setLessonVideoFile(file || null);

        if (file) {
            // Upload mode replaces any current URL.
            setLessonVideoUrl('');
            setExistingVideoFile('');
        }
    };

    const handleSaveLesson = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (!lessonTitle.trim()) {
            setMessage({ type: 'error', text: 'Lesson title is required.' });
            return;
        }

        const hasUrl = Boolean(lessonVideoUrl.trim());
        const hasNewFile = Boolean(lessonVideoFile);
        const hasExistingFile = Boolean(existingVideoFile);

        if ((hasUrl && hasNewFile) || (hasUrl && hasExistingFile)) {
            setMessage({ type: 'error', text: 'Use either a video URL or an MP4 upload, not both.' });
            return;
        }

        if (!hasUrl && !hasNewFile && !hasExistingFile) {
            setMessage({ type: 'error', text: 'Please provide a video URL or upload an MP4 file.' });
            return;
        }

        setSaving(true);
        try {
            const lessonData = new FormData();
            lessonData.append('course_id', id);
            lessonData.append('title', lessonTitle.trim());
            lessonData.append('content', lessonContent.trim());
            lessonData.append('price', (parseFloat(lessonPrice) || 0).toString());
            lessonData.append('is_preview', String(lessonIsPreview));
            lessonData.append('video_url', hasUrl ? normalizeLessonUrl(lessonVideoUrl) : '');
            lessonData.append('keep_existing_video_file', String(hasExistingFile && !hasUrl && !hasNewFile));

            if (lessonVideoFile) {
                lessonData.append('video_file', lessonVideoFile);
            }

            if (editingLesson) {
                await lessonAPI.update(editingLesson.lesson_id, lessonData);
                setMessage({ type: 'success', text: 'Lesson updated!' });
            } else {
                await lessonAPI.create(lessonData);
                setMessage({ type: 'success', text: 'Lesson added!' });
            }

            resetLessonForm();
            fetchCourse();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save lesson.' });
        } finally {
            setSaving(false);
        }
    };

    const handleEditLesson = (lesson) => {
        setEditingLesson(lesson);
        setLessonTitle(lesson.title);
        setLessonContent(lesson.content || '');
        setLessonVideoUrl(lesson.video_url || '');
        setLessonVideoFile(null);
        setExistingVideoFile(lesson.video_file || '');
        setLessonPrice(lesson.price.toString());
        setLessonIsPreview(lesson.is_preview);
        setShowLessonForm(true);
    };

    const handleDeleteLesson = async (lessonId) => {
        if (!window.confirm('Delete this lesson?')) {
            return;
        }

        try {
            await lessonAPI.delete(lessonId);
            setMessage({ type: 'success', text: 'Lesson deleted.' });
            fetchCourse();
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to delete lesson.' });
        }
    };

    if (loading) {
        return (
            <div className="container">
                <div className="loading"><div className="spinner"></div> Loading...</div>
            </div>
        );
    }

    const isUrlMode = Boolean(lessonVideoUrl.trim());
    const isFileMode = Boolean(lessonVideoFile || existingVideoFile);

    return (
        <div className="container">
            <div className="page-header">
                <h1>{isEditing ? 'Edit Course' : 'Create New Course'}</h1>
                <p>{isEditing ? 'Update your course details and manage lessons' : 'Fill in the details to create a new course'}</p>
            </div>

            {message.text && (
                <div className={`alert alert-${message.type}`}>{message.text}</div>
            )}

            <div className="two-col">
                <div className="card">
                    <div className="card-body">
                        <h2 style={{ marginBottom: '1.5rem' }}>Course Details</h2>

                        <form onSubmit={handleSaveCourse}>
                            <div className="form-group">
                                <label>Course Title *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g., Introduction to Web Development"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    className="form-control"
                                    placeholder="Describe what students will learn..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                />
                            </div>

                            <div className="form-group">
                                <label>Price ($)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    placeholder="49.99"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    min="0"
                                    step="0.01"
                                />
                            </div>

                            <div className="form-group">
                                <label>Estimated Duration (hours)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    placeholder="e.g., 10 hours"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    min="1"
                                    step="1"
                                />
                                <small style={{ color: 'var(--gray)' }}>
                                    How long will it take to complete this course?
                                </small>
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={isPublished}
                                        onChange={(e) => setIsPublished(e.target.checked)}
                                    />
                                    Publish course (visible to students)
                                </label>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : (isEditing ? 'Update Course' : 'Create Course')}
                                </button>
                                {isEditing && (
                                    <button type="button" className="btn btn-danger" onClick={handleDeleteCourse}>
                                        Delete Course
                                    </button>
                                )}
                                <button type="button" className="btn btn-secondary" onClick={() => navigate('/instructor')}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div>
                    {isEditing ? (
                        <div className="card">
                            <div className="card-body">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h2>Lessons ({lessons.length})</h2>
                                    <button
                                        className="btn btn-success btn-sm"
                                        onClick={() => { resetLessonForm(); setShowLessonForm(true); }}
                                    >
                                        Add Lesson
                                    </button>
                                </div>

                                {showLessonForm && (
                                    <div style={{ background: 'var(--lighter-gray)', padding: '1.5rem', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
                                        <h3 style={{ marginBottom: '1rem' }}>
                                            {editingLesson ? 'Edit Lesson' : 'New Lesson'}
                                        </h3>

                                        <form onSubmit={handleSaveLesson}>
                                            <div className="form-group">
                                                <label>Lesson Title *</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={lessonTitle}
                                                    onChange={(e) => setLessonTitle(e.target.value)}
                                                    required
                                                    placeholder="Lesson title"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Content</label>
                                                <textarea
                                                    className="form-control"
                                                    value={lessonContent}
                                                    onChange={(e) => setLessonContent(e.target.value)}
                                                    rows={3}
                                                    placeholder="Lesson content..."
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Video URL</label>
                                                <input
                                                    type="url"
                                                    className="form-control"
                                                    value={lessonVideoUrl}
                                                    onChange={(e) => handleVideoUrlChange(e.target.value)}
                                                    placeholder="https://youtube.com/... or other external video link"
                                                    disabled={isFileMode}
                                                />
                                                <small style={{ color: 'var(--gray)' }}>
                                                    Enter a video URL or upload an MP4 file below.
                                                </small>
                                                {isUrlMode && (
                                                    <div style={{ marginTop: '0.5rem' }}>
                                                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLessonVideoUrl('')}>
                                                            Clear URL
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="form-group">
                                                <label>Upload MP4 File</label>
                                                <input
                                                    type="file"
                                                    className="form-control"
                                                    accept=".mp4,video/mp4"
                                                    onChange={(e) => handleVideoFileChange(e.target.files?.[0] || null)}
                                                    disabled={isUrlMode}
                                                />
                                                <small style={{ color: 'var(--gray)' }}>
                                                    Only MP4 files are allowed. Maximum size: 50MB.
                                                </small>

                                                {existingVideoFile && !lessonVideoFile && (
                                                    <div style={{ marginTop: '0.75rem', color: 'var(--gray)' }}>
                                                        Current uploaded video is attached to this lesson.
                                                        <div style={{ marginTop: '0.5rem' }}>
                                                            <button
                                                                type="button"
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() => setExistingVideoFile('')}
                                                            >
                                                                Remove Uploaded Video
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {lessonVideoFile && (
                                                    <div style={{ marginTop: '0.75rem', color: 'var(--gray)' }}>
                                                        Selected file: <strong>{lessonVideoFile.name}</strong>
                                                        <div style={{ marginTop: '0.5rem' }}>
                                                            <button
                                                                type="button"
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() => setLessonVideoFile(null)}
                                                            >
                                                                Clear File
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="form-group">
                                                <label>Price ($)</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={lessonPrice}
                                                    onChange={(e) => setLessonPrice(e.target.value)}
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="9.99"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={lessonIsPreview}
                                                        onChange={(e) => setLessonIsPreview(e.target.checked)}
                                                    />
                                                    Free preview lesson
                                                </label>
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                                                    {saving ? 'Saving...' : 'Save Lesson'}
                                                </button>
                                                <button type="button" className="btn btn-secondary btn-sm" onClick={resetLessonForm}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {lessons.length === 0 ? (
                                    <div className="empty-state">
                                        <p>No lessons yet. Add your first lesson!</p>
                                    </div>
                                ) : (
                                    <ul className="lesson-list">
                                        {lessons.map((lesson, index) => (
                                            <li key={lesson.lesson_id} className="lesson-item">
                                                <div className="lesson-info">
                                                    <span className="lesson-number">{index + 1}</span>
                                                    <div>
                                                        <div className="lesson-title">{lesson.title}</div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>
                                                            ${lesson.price.toFixed(2)}
                                                            {lesson.is_preview && <span className="badge badge-free" style={{ marginLeft: '0.5rem' }}>FREE</span>}
                                                            {lesson.video_url && <span style={{ marginLeft: '0.5rem' }}>URL Video</span>}
                                                            {lesson.video_file && <span style={{ marginLeft: '0.5rem' }}>Uploaded MP4</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => handleEditLesson(lesson)}>Edit</button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteLesson(lesson.lesson_id)}>Delete</button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="card">
                            <div className="card-body">
                                <div className="empty-state">
                                    <h3>Lessons</h3>
                                    <p>Save the course first, then you can add lessons.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ManageCourse;
