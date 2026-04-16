// ============================================================
// Lesson Page
// Displays lesson content (video + text) with progress tracking
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { lessonAPI, progressAPI } from '../services/api';

// Detect the type of lesson video URL so we can render the right player.
const getLessonVideoMeta = (videoUrl) => {
    if (!videoUrl) {
        return {
            normalizedUrl: '',
            isDirectVideoFile: false,
            embedUrl: '',
            isEmbeddable: false
        };
    }

    const normalizedUrl = /^https?:\/\//i.test(videoUrl) ? videoUrl : `https://${videoUrl}`;

    let parsedUrl;
    try {
        parsedUrl = new URL(normalizedUrl);
    } catch (error) {
        return {
            normalizedUrl,
            isDirectVideoFile: false,
            embedUrl: '',
            isEmbeddable: false
        };
    }

    const pathname = parsedUrl.pathname.toLowerCase();
    const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
    let embedUrl = '';

    // Convert common YouTube URL formats into the iframe embed URL.
    if (host === 'youtube.com' || host === 'm.youtube.com') {
        const videoId = parsedUrl.searchParams.get('v');
        if (videoId) {
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }
    } else if (host === 'youtu.be') {
        const videoId = parsedUrl.pathname.split('/').filter(Boolean)[0];
        if (videoId) {
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }
    } else if (host === 'vimeo.com') {
        const videoId = parsedUrl.pathname.split('/').filter(Boolean)[0];
        if (videoId) {
            embedUrl = `https://player.vimeo.com/video/${videoId}`;
        }
    } else if (host === 'player.vimeo.com') {
        embedUrl = normalizedUrl;
    }

    return {
        normalizedUrl,
        isDirectVideoFile: /\.(mp4|webm|ogg|mov|m4v)$/i.test(pathname),
        embedUrl,
        isEmbeddable: Boolean(embedUrl)
    };
};

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

    // Update progress when the learner starts or completes a lesson.
    const handleProgress = async (status) => {
        try {
            await progressAPI.updateProgress(id, status);
            setMessage({
                type: 'success',
                text: status === 'completed' ? 'Lesson marked as completed!' : 'Progress updated!'
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

    const { normalizedUrl, isDirectVideoFile, embedUrl, isEmbeddable } = getLessonVideoMeta(lesson.video_url);

    return (
        <div className="container">
            {message.text && (
                <div className={`alert alert-${message.type}`}>{message.text}</div>
            )}

            <div style={{ marginBottom: '1rem', color: 'var(--gray)' }}>
                <Link to="/courses">Courses</Link> {'>'}{' '}
                <Link to={`/courses/${lesson.course_id}`}>{lesson.course_title}</Link> {'>'}{' '}
                <span>{lesson.title}</span>
            </div>

            <div className="lesson-content">
                <h1>{lesson.title}</h1>

                {!lesson.has_access ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <h2>This lesson is locked</h2>
                        <p style={{ color: 'var(--gray)', margin: '1rem 0' }}>
                            Purchase this lesson or the full course to access the content.
                        </p>
                        <Link to={`/courses/${lesson.course_id}`} className="btn btn-primary btn-lg">
                            Go to Course
                        </Link>
                    </div>
                ) : (
                    <>
                        {lesson.video_url ? (
                            isDirectVideoFile ? (
                                <div className="video-container">
                                    <video
                                        controls
                                        style={{ width: '100%', height: '100%', borderRadius: 'var(--radius)' }}
                                        onPlay={() => handleProgress('in_progress')}
                                    >
                                        <source src={normalizedUrl} type="video/mp4" />
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                            ) : isEmbeddable ? (
                                <div className="video-container">
                                    <iframe
                                        src={embedUrl}
                                        title={`${lesson.title} video`}
                                        style={{ width: '100%', height: '100%', border: 0, borderRadius: 'var(--radius)' }}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                        referrerPolicy="strict-origin-when-cross-origin"
                                        onLoad={() => handleProgress('in_progress')}
                                    />
                                </div>
                            ) : (
                                <div
                                    className="video-container"
                                    style={{ display: 'grid', placeItems: 'center', padding: '2rem', textAlign: 'center' }}
                                >
                                    <div>
                                        <h3 style={{ marginBottom: '0.75rem' }}>Open Lesson Video</h3>
                                        <p style={{ color: 'var(--gray)', marginBottom: '1rem' }}>
                                            This lesson uses an external video link, so it should be opened in a new tab.
                                        </p>
                                        <a
                                            href={normalizedUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-primary"
                                            onClick={() => handleProgress('in_progress')}
                                        >
                                            Watch Video
                                        </a>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="video-container">
                                No video available for this lesson
                            </div>
                        )}

                        <div className="lesson-text">
                            <h2 style={{ marginBottom: '1rem' }}>Lesson Content</h2>
                            <p>{lesson.content}</p>
                        </div>

                        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => handleProgress('in_progress')}
                            >
                                Mark In Progress
                            </button>
                            <button
                                className="btn btn-success btn-lg"
                                onClick={() => handleProgress('completed')}
                            >
                                Mark as Completed
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default LessonPage;
