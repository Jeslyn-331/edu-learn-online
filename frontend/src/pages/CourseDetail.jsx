// ============================================================
// Course Detail Page
// Shows course info, lessons list, and purchase options
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { courseAPI, purchaseAPI, certificateAPI, progressAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function CourseDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, isAuthenticated, updateUser } = useAuth();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [certStatus, setCertStatus] = useState(null);
    const [generatingCert, setGeneratingCert] = useState(false);

    // Fetch course details
    useEffect(() => {
        fetchCourse();
    }, [id]);

    // Check certificate status when course is purchased
    useEffect(() => {
        if (isAuthenticated && course?.is_purchased) {
            checkCertificateStatus();
        }
    }, [course?.is_purchased, isAuthenticated]);

    // Check if user can get a certificate
    const checkCertificateStatus = async () => {
        try {
            const response = await certificateAPI.check(id);
            setCertStatus(response.data);
        } catch (err) {
            console.error('Failed to check certificate status:', err);
        }
    };

    // Generate certificate
    const handleGenerateCertificate = async () => {
        setGeneratingCert(true);
        try {
            const response = await certificateAPI.generate(id);
            setMessage({ type: 'success', text: response.data.message });
            checkCertificateStatus(); // Refresh status
        } catch (err) {
            setMessage({
                type: 'error',
                text: err.response?.data?.message || 'Failed to generate certificate.'
            });
        } finally {
            setGeneratingCert(false);
        }
    };

    const fetchCourse = async () => {
        try {
            setLoading(true);
            const response = await courseAPI.getById(id);
            setCourse(response.data.course);
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to load course details.' });
        } finally {
            setLoading(false);
        }
    };

    // Purchase full course
    const handleBuyCourse = async () => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        if (purchasing) return;
        setPurchasing(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await purchaseAPI.buyCourse(id);
            setMessage({ type: 'success', text: response.data.message });
            updateUser({ wallet_balance: response.data.wallet_balance });
            fetchCourse(); // Refresh to show purchased status
        } catch (err) {
            setMessage({ 
                type: 'error', 
                text: err.response?.data?.message || 'Purchase failed.' 
            });
        } finally {
            setPurchasing(false);
        }
    };

    // Purchase individual lesson
    const handleBuyLesson = async (lessonId) => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        setPurchasing(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await purchaseAPI.buyLesson(lessonId);
            setMessage({ type: 'success', text: response.data.message });
            updateUser({ wallet_balance: response.data.wallet_balance });
            fetchCourse(); // Refresh
        } catch (err) {
            setMessage({ 
                type: 'error', 
                text: err.response?.data?.message || 'Purchase failed.' 
            });
        } finally {
            setPurchasing(false);
        }
    };

    // Check if user has access to a lesson
    const hasLessonAccess = (lesson) => {
        if (lesson.is_preview) return true;
        if (course?.is_purchased) return true;
        if (course?.purchased_lessons?.includes(lesson.lesson_id)) return true;
        return false;
    };

    if (loading) {
        return (
            <div className="container">
                <div className="loading"><div className="spinner"></div> Loading course...</div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="container">
                <div className="empty-state">
                    <h3>Course not found</h3>
                    <p>The course you're looking for doesn't exist.</p>
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

            <div className="two-col">
                {/* Left Column - Course Info */}
                <div>
                    <div className="card">
                        <div className="card-image" style={{ height: '220px', fontSize: '3rem' }}>
                            {course.title.charAt(0).toUpperCase()}
                        </div>
                        <div className="card-body">
                            <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{course.title}</h1>
                            <p style={{ color: 'var(--gray)', marginBottom: '1rem' }}>
                                👨‍🏫 By {course.instructor_name} • 👥 {course.student_count} students
                            </p>
                            <p className="card-text" style={{ lineHeight: '1.8' }}>
                                {course.description}
                            </p>

                            {/* Purchase Section */}
                            <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'var(--lighter-gray)', borderRadius: 'var(--radius)' }}>
                                {course.is_purchased ? (
                                    <div>
                                        <span className="badge-purchased" style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}>
                                            ✅ Course Purchased
                                        </span>
                                        <p style={{ marginTop: '0.5rem', color: 'var(--gray)' }}>
                                            You have full access to all lessons.
                                        </p>

                                        {/* Certificate Section - only shown for purchased courses */}
                                        {certStatus && (
                                            <div style={{ marginTop: '1rem', padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                {certStatus.has_certificate ? (
                                                    // Already has certificate
                                                    <div style={{ textAlign: 'center' }}>
                                                        <span style={{ fontSize: '2rem' }}>🎓</span>
                                                        <p style={{ fontWeight: 600, color: 'var(--success)', margin: '0.5rem 0' }}>
                                                            Certificate Earned!
                                                        </p>
                                                        <p style={{ fontSize: '0.85rem', color: 'var(--gray)', fontFamily: 'monospace' }}>
                                                            {certStatus.certificate?.certificate_code}
                                                        </p>
                                                        <Link to="/certificates" className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>
                                                            View Certificate
                                                        </Link>
                                                    </div>
                                                ) : certStatus.is_completed ? (
                                                    // Course completed, can generate certificate
                                                    <div style={{ textAlign: 'center' }}>
                                                        <span style={{ fontSize: '2rem' }}>🎉</span>
                                                        <p style={{ fontWeight: 600, margin: '0.5rem 0' }}>
                                                            Course Completed! Get your certificate:
                                                        </p>
                                                        <button
                                                            className="btn btn-success"
                                                            onClick={handleGenerateCertificate}
                                                            disabled={generatingCert}
                                                        >
                                                            {generatingCert ? 'Generating...' : '🎓 Get Certificate'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    // Still in progress
                                                    <div>
                                                        <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                                            📊 Progress: {certStatus.completed_lessons}/{certStatus.total_lessons} lessons completed
                                                        </p>
                                                        <div style={{ background: '#e2e8f0', borderRadius: '10px', height: '10px', overflow: 'hidden' }}>
                                                            <div style={{
                                                                background: 'var(--primary)',
                                                                height: '100%',
                                                                width: `${certStatus.total_lessons > 0 ? (certStatus.completed_lessons / certStatus.total_lessons) * 100 : 0}%`,
                                                                borderRadius: '10px',
                                                                transition: 'width 0.3s ease'
                                                            }}></div>
                                                        </div>
                                                        <p style={{ fontSize: '0.8rem', color: 'var(--gray)', marginTop: '0.5rem' }}>
                                                            Complete all lessons to earn your certificate! 🎓
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <p style={{ fontSize: '0.9rem', color: 'var(--gray)' }}>Full Course Price</p>
                                                <p className="price" style={{ fontSize: '2rem' }}>${course.price.toFixed(2)}</p>
                                            </div>
                                            <button 
                                                className="btn btn-success btn-lg"
                                                onClick={handleBuyCourse}
                                                disabled={purchasing}
                                            >
                                                {purchasing ? 'Processing...' : '🛒 Buy Full Course'}
                                            </button>
                                        </div>
                                        {isAuthenticated && (
                                            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--gray)' }}>
                                                Your balance: ${user?.wallet_balance?.toFixed(2)}
                                                {user?.wallet_balance < course.price && (
                                                    <> — <Link to="/wallet" style={{ color: 'var(--warning)' }}>Top up wallet</Link></>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Lessons List */}
                <div>
                    <div className="card">
                        <div className="card-body">
                            <h2 style={{ marginBottom: '1rem' }}>
                                📖 Lessons ({course.lessons?.length || 0})
                            </h2>

                            {course.lessons?.length === 0 ? (
                                <div className="empty-state">
                                    <p>No lessons available yet.</p>
                                </div>
                            ) : (
                                <ul className="lesson-list">
                                    {course.lessons?.map((lesson, index) => {
                                        const hasAccess = hasLessonAccess(lesson);
                                        return (
                                            <li key={lesson.lesson_id} className="lesson-item">
                                                <div className="lesson-info">
                                                    <span className="lesson-number">{index + 1}</span>
                                                    <div>
                                                        <div className="lesson-title">
                                                            {hasAccess ? (
                                                                <Link to={`/lessons/${lesson.lesson_id}`}>
                                                                    {lesson.title}
                                                                </Link>
                                                            ) : (
                                                                <span>{lesson.title}</span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginTop: '0.2rem' }}>
                                                            {lesson.is_preview && <span className="badge badge-free">FREE PREVIEW</span>}
                                                            {!lesson.is_preview && hasAccess && <span className="badge badge-purchased">PURCHASED</span>}
                                                            {!lesson.is_preview && !hasAccess && <span className="badge badge-locked">🔒 LOCKED</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    {!hasAccess && !course.is_purchased && !lesson.is_preview && (
                                                        <>
                                                            <span className="lesson-price">${lesson.price.toFixed(2)}</span>
                                                            <br />
                                                            <button 
                                                                className="btn btn-primary btn-sm"
                                                                onClick={() => handleBuyLesson(lesson.lesson_id)}
                                                                disabled={purchasing}
                                                                style={{ marginTop: '0.3rem' }}
                                                            >
                                                                Buy Lesson
                                                            </button>
                                                        </>
                                                    )}
                                                    {hasAccess && (
                                                        <Link to={`/lessons/${lesson.lesson_id}`} className="btn btn-secondary btn-sm">
                                                            ▶ View
                                                        </Link>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CourseDetail;
