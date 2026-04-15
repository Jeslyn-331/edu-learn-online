// ============================================================
// Course Detail Page
// Shows course info, lessons list, and purchase options
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { courseAPI, purchaseAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function CourseDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, isAuthenticated, updateUser } = useAuth();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Fetch course details
    useEffect(() => {
        fetchCourse();
    }, [id]);

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
