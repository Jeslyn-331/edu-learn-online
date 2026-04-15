// ============================================================
// Lesson Page
// Displays lesson content (video + text) with progress tracking
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { lessonAPI, progressAPI } from '../services/api';

function LessonPage() {
    const { id } = useParams();
    const [lesson, setLesson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Fetch lesson details
    useEffect(() => {
        fetchLesson();
    }, [id]);

    const fetchLesson = async () => {
        try {
            setLoading(true);
            const response = await lessonAPI.getById(id);
            setLesson(response.data.lesson);
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to load lesson.' });
        } finally {
            setLoading(false);
        }
    };

    // Update progress
    const handleProgress = async (status) => {
        try {
            await progressAPI.updateProgress(id, status);
            setMessage({ 
                type: 'success', 
                text: status === 'completed' ? '🎉 Lesson marked as completed!' : 'Progress updated!' 
            });
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to update progress.' });
        }
    };

    if (loading) {
        return (
            <div className="container">
                <div className="loading"><div className="spinner"></div> Loading lesson...</div>
            </div>
        );
    }

    if (!lesson) {
        return (
            <div className="container">
                <div className="empty-state">
                    <h3>Lesson not found</h3>
                    <Link to="/courses" className="btn btn-primary">Browse Courses</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            {/* Messages */}
            {message.text && (
                <div className={`alert alert-${message.type}`}>{message.text}</div>
            )}

            {/* Breadcrumb */}
            <div style={{ marginBottom: '1rem', color: 'var(--gray)' }}>
                <Link to="/courses">Courses</Link> → 
                <Link to={`/courses/${lesson.course_id}`}> {lesson.course_title}</Link> → 
                <span> {lesson.title}</span>
            </div>

            <div className="lesson-content">
                <h1>{lesson.title}</h1>

                {/* Access Check */}
                {!lesson.has_access ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <h2>🔒 This lesson is locked</h2>
                        <p style={{ color: 'var(--gray)', margin: '1rem 0' }}>
                            Purchase this lesson or the full course to access the content.
                        </p>
                        <Link to={`/courses/${lesson.course_id}`} className="btn btn-primary btn-lg">
                            Go to Course
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Video Player */}
                        {lesson.video_url ? (
                            <div className="video-container">
                                <video 
                                    controls 
                                    style={{ width: '100%', height: '100%', borderRadius: 'var(--radius)' }}
                                    onPlay={() => handleProgress('in_progress')}
                                >
                                    <source src={lesson.video_url} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                        ) : (
                            <div className="video-container">
                                📹 No video available for this lesson
                            </div>
                        )}

                        {/* Lesson Text Content */}
                        <div className="lesson-text">
                            <h2 style={{ marginBottom: '1rem' }}>📝 Lesson Content</h2>
                            <p>{lesson.content}</p>
                        </div>

                        {/* Progress Buttons */}
                        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button 
                                className="btn btn-secondary"
                                onClick={() => handleProgress('in_progress')}
                            >
                                📖 Mark In Progress
                            </button>
                            <button 
                                className="btn btn-success btn-lg"
                                onClick={() => handleProgress('completed')}
                            >
                                ✅ Mark as Completed
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default LessonPage;
