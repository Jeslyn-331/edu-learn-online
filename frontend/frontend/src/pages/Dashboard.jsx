// ============================================================
// Dashboard Page (Student)
// Shows purchased courses, lessons, and learning stats
// ============================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { purchaseAPI, progressAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
    const { user } = useAuth();
    const [coursePurchases, setCoursePurchases] = useState([]);
    const [lessonPurchases, setLessonPurchases] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch dashboard data
    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [purchasesRes, statsRes] = await Promise.all([
                purchaseAPI.getAll(),
                progressAPI.getStats()
            ]);
            setCoursePurchases(purchasesRes.data.course_purchases);
            setLessonPurchases(purchasesRes.data.lesson_purchases);
            setStats(statsRes.data.stats);
        } catch (err) {
            console.error('Dashboard error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Format date
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="container">
                <div className="loading"><div className="spinner"></div> Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="page-header">
                <h1>📊 My Learning Dashboard</h1>
                <p>Welcome back, {user?.name}! Here's your learning progress.</p>
            </div>

            {/* Stats Grid */}
            {stats && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{stats.enrolled_courses}</div>
                        <div className="stat-label">Enrolled Courses</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.completed_lessons}</div>
                        <div className="stat-label">Completed Lessons</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.in_progress_lessons}</div>
                        <div className="stat-label">In Progress</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.total_purchases}</div>
                        <div className="stat-label">Total Purchases</div>
                    </div>
                </div>
            )}

            {/* Purchased Courses */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div className="card-body">
                    <h2 style={{ marginBottom: '1rem' }}>📚 My Courses</h2>

                    {coursePurchases.length === 0 ? (
                        <div className="empty-state">
                            <h3>No courses purchased yet</h3>
                            <p>Browse our catalog and find your next course!</p>
                            <Link to="/courses" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                                Browse Courses
                            </Link>
                        </div>
                    ) : (
                        <div className="course-grid">
                            {coursePurchases.map(purchase => (
                                <Link 
                                    to={`/courses/${purchase.course_id}`} 
                                    key={purchase.purchase_id}
                                    style={{ textDecoration: 'none' }}
                                >
                                    <div className="card course-card">
                                        <div className="card-image" style={{ height: '120px' }}>
                                            {purchase.course_title.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="card-body">
                                            <h3 className="card-title">{purchase.course_title}</h3>
                                            <p className="card-text">
                                                {purchase.description?.substring(0, 80)}...
                                            </p>
                                            <div className="stats">
                                                <span>👨‍🏫 {purchase.instructor_name}</span>
                                                <span>📅 {formatDate(purchase.purchased_at)}</span>
                                            </div>
                                            <div style={{ marginTop: '0.75rem' }}>
                                                <span className="btn btn-primary btn-sm btn-block">
                                                    Continue Learning →
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Purchased Individual Lessons */}
            {lessonPurchases.length > 0 && (
                <div className="card">
                    <div className="card-body">
                        <h2 style={{ marginBottom: '1rem' }}>📖 Individual Lessons</h2>
                        
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Lesson</th>
                                        <th>Course</th>
                                        <th>Instructor</th>
                                        <th>Price</th>
                                        <th>Date</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lessonPurchases.map(purchase => (
                                        <tr key={purchase.purchase_id}>
                                            <td><strong>{purchase.lesson_title}</strong></td>
                                            <td>{purchase.course_title}</td>
                                            <td>{purchase.instructor_name}</td>
                                            <td>${purchase.price.toFixed(2)}</td>
                                            <td>{formatDate(purchase.purchased_at)}</td>
                                            <td>
                                                <Link 
                                                    to={`/lessons/${purchase.lesson_id}`}
                                                    className="btn btn-primary btn-sm"
                                                >
                                                    ▶ View
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
