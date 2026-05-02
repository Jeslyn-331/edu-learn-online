// ============================================================
// Analytics Page - Best-Selling Courses Dashboard
// Shows top-selling courses, revenue charts, platform stats
// Uses pure CSS bar charts (no external chart library needed)
// ============================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../services/api';

function Analytics() {
    const [bestSellers, setBestSellers] = useState([]);
    const [stats, setStats] = useState(null);
    const [revenue, setRevenue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Fetch all analytics data on mount
    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            // Fetch all 3 endpoints in parallel for speed
            const [bestRes, statsRes, revRes] = await Promise.all([
                dashboardAPI.getBestSellers(10),
                dashboardAPI.getStats(),
                dashboardAPI.getRevenue()
            ]);
            setBestSellers(bestRes.data.best_sellers);
            setStats(statsRes.data.stats);
            setRevenue(revRes.data);
        } catch (err) {
            console.error('Failed to load analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    // Format date nicely
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    // Get max value for chart scaling
    const getMaxSales = () => {
        if (bestSellers.length === 0) return 1;
        return Math.max(...bestSellers.map(c => c.total_sales), 1);
    };

    const getMaxRevenue = () => {
        if (!revenue || revenue.revenue_by_course.length === 0) return 1;
        return Math.max(...revenue.revenue_by_course.map(c => c.total_revenue), 1);
    };

    // Colors for chart bars
    const barColors = [
        '#4f46e5', '#7c3aed', '#2563eb', '#0891b2', '#059669',
        '#d97706', '#dc2626', '#db2777', '#4338ca', '#0d9488'
    ];

    if (loading) {
        return (
            <div className="container">
                <div className="loading"><div className="spinner"></div> Loading analytics...</div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="page-header">
                <h1>📊 Best-Selling Courses Dashboard</h1>
                <p>Analytics overview of course sales, revenue, and platform statistics</p>
            </div>

            {/* Platform Stats Overview */}
            {stats && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{stats.total_courses}</div>
                        <div className="stat-label">📚 Courses</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.total_students}</div>
                        <div className="stat-label">👥 Students</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.total_instructors}</div>
                        <div className="stat-label">🧑‍🏫 Instructors</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.total_purchases}</div>
                        <div className="stat-label">🛒 Purchases</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value" style={{ color: 'var(--success)' }}>
                            ${stats.total_revenue.toFixed(2)}
                        </div>
                        <div className="stat-label">💰 Total Revenue</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.total_certificates}</div>
                        <div className="stat-label">🎓 Certificates</div>
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {['overview', 'sales-chart', 'revenue-chart', 'recent'].map(tab => (
                    <button
                        key={tab}
                        className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'overview' && '🥇 Top Sellers'}
                        {tab === 'sales-chart' && '📊 Sales Chart'}
                        {tab === 'revenue-chart' && '📈 Revenue Chart'}
                        {tab === 'recent' && '🕐 Recent Sales'}
                    </button>
                ))}
            </div>

            {/* ============================================================ */}
            {/* TAB 1: Top Sellers Table */}
            {/* ============================================================ */}
            {activeTab === 'overview' && (
                <div className="card">
                    <div className="card-body">
                        <h2 style={{ marginBottom: '1rem' }}>🥇 Top Best-Selling Courses</h2>
                        <p style={{ color: 'var(--gray)', marginBottom: '1.5rem' }}>
                            Courses ranked by number of sales (most popular first)
                        </p>

                        {bestSellers.length === 0 ? (
                            <div className="empty-state">
                                <h3>No sales data yet</h3>
                                <p>Courses will appear here once purchases are made.</p>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Rank</th>
                                            <th>Course</th>
                                            <th>Instructor</th>
                                            <th>Price</th>
                                            <th>Total Sales</th>
                                            <th>Students</th>
                                            <th>Total Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bestSellers.map((course, index) => (
                                            <tr key={course.course_id}>
                                                <td>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '50%',
                                                        background: index === 0 ? '#fbbf24' : index === 1 ? '#9ca3af' : index === 2 ? '#cd7f32' : 'var(--lighter-gray)',
                                                        color: index < 3 ? 'white' : 'var(--dark)',
                                                        fontWeight: 700,
                                                        fontSize: '0.85rem'
                                                    }}>
                                                        {index + 1}
                                                    </span>
                                                </td>
                                                <td>
                                                    <Link to={`/courses/${course.course_id}`} style={{ fontWeight: 600 }}>
                                                        {course.title}
                                                    </Link>
                                                </td>
                                                <td>{course.instructor_name}</td>
                                                <td>${course.course_price.toFixed(2)}</td>
                                                <td>
                                                    <strong style={{ color: 'var(--primary)' }}>
                                                        {course.total_sales}
                                                    </strong>
                                                </td>
                                                <td>{course.total_students}</td>
                                                <td>
                                                    <strong style={{ color: 'var(--success)' }}>
                                                        ${course.total_revenue.toFixed(2)}
                                                    </strong>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* TAB 2: Sales Bar Chart (Pure CSS) */}
            {/* ============================================================ */}
            {activeTab === 'sales-chart' && (
                <div className="card">
                    <div className="card-body">
                        <h2 style={{ marginBottom: '1rem' }}>📊 Sales Comparison Chart</h2>
                        <p style={{ color: 'var(--gray)', marginBottom: '1.5rem' }}>
                            Number of sales per course (horizontal bar chart)
                        </p>

                        {bestSellers.length === 0 ? (
                            <div className="empty-state">
                                <h3>No sales data yet</h3>
                                <p>Charts will appear once purchases are made.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {bestSellers.map((course, index) => {
                                    const maxSales = getMaxSales();
                                    const widthPercent = (course.total_sales / maxSales) * 100;
                                    return (
                                        <div key={course.course_id}>
                                            {/* Course name */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                                                    {course.title}
                                                </span>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                                                    {course.total_sales} sales
                                                </span>
                                            </div>
                                            {/* Bar */}
                                            <div style={{
                                                background: '#e2e8f0',
                                                borderRadius: '8px',
                                                height: '32px',
                                                overflow: 'hidden',
                                                position: 'relative'
                                            }}>
                                                <div style={{
                                                    background: `linear-gradient(90deg, ${barColors[index % barColors.length]}, ${barColors[index % barColors.length]}dd)`,
                                                    height: '100%',
                                                    width: `${Math.max(widthPercent, 2)}%`,
                                                    borderRadius: '8px',
                                                    transition: 'width 0.8s ease',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    paddingLeft: '0.75rem'
                                                }}>
                                                    {widthPercent > 15 && (
                                                        <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: 600 }}>
                                                            {course.total_sales}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* TAB 3: Revenue Bar Chart (Pure CSS) */}
            {/* ============================================================ */}
            {activeTab === 'revenue-chart' && (
                <div className="card">
                    <div className="card-body">
                        <h2 style={{ marginBottom: '0.5rem' }}>📈 Revenue Comparison Chart</h2>
                        {revenue && (
                            <p style={{ color: 'var(--success)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                                Total Platform Revenue: ${revenue.total_revenue.toFixed(2)}
                            </p>
                        )}

                        {!revenue || revenue.revenue_by_course.length === 0 ? (
                            <div className="empty-state">
                                <h3>No revenue data yet</h3>
                                <p>Revenue charts will appear once purchases are made.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {revenue.revenue_by_course.map((course, index) => {
                                    const maxRev = getMaxRevenue();
                                    const widthPercent = (course.total_revenue / maxRev) * 100;
                                    return (
                                        <div key={course.course_id}>
                                            {/* Course name */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                                                    {course.title}
                                                </span>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--success)' }}>
                                                    ${course.total_revenue.toFixed(2)} ({course.total_sales} sales)
                                                </span>
                                            </div>
                                            {/* Bar */}
                                            <div style={{
                                                background: '#e2e8f0',
                                                borderRadius: '8px',
                                                height: '32px',
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    background: `linear-gradient(90deg, #059669, #10b981)`,
                                                    height: '100%',
                                                    width: `${Math.max(widthPercent, 2)}%`,
                                                    borderRadius: '8px',
                                                    transition: 'width 0.8s ease',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    paddingLeft: '0.75rem'
                                                }}>
                                                    {widthPercent > 20 && (
                                                        <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: 600 }}>
                                                            ${course.total_revenue.toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* TAB 4: Recent Purchases */}
            {/* ============================================================ */}
            {activeTab === 'recent' && (
                <div className="card">
                    <div className="card-body">
                        <h2 style={{ marginBottom: '1rem' }}>🕐 Recent Purchases</h2>
                        <p style={{ color: 'var(--gray)', marginBottom: '1.5rem' }}>
                            Latest 10 purchases on the platform
                        </p>

                        {!revenue || revenue.recent_purchases.length === 0 ? (
                            <div className="empty-state">
                                <h3>No purchases yet</h3>
                                <p>Recent purchases will appear here.</p>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Buyer</th>
                                            <th>Course</th>
                                            <th>Price</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {revenue.recent_purchases.map((purchase, index) => (
                                            <tr key={purchase.purchase_id}>
                                                <td>{index + 1}</td>
                                                <td><strong>{purchase.buyer_name}</strong></td>
                                                <td>{purchase.course_title || 'Individual Lesson'}</td>
                                                <td style={{ color: 'var(--success)' }}>
                                                    ${purchase.price.toFixed(2)}
                                                </td>
                                                <td>{formatDate(purchase.purchased_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Analytics;
