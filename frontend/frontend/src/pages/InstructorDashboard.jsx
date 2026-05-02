// ============================================================
// Instructor Dashboard Page
// Shows instructor stats, courses, earnings, and students
// ============================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI, dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function InstructorDashboard() {
    const { user, updateUser } = useAuth();
    const [dashboard, setDashboard] = useState(null);
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [earnings, setEarnings] = useState(null);
    const [bestSellers, setBestSellers] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Fetch dashboard data
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [dashRes, coursesRes, studentsRes, earningsRes, bestSellersRes] = await Promise.all([
                adminAPI.getDashboard(),
                adminAPI.getCourses(),
                adminAPI.getStudents(),
                adminAPI.getEarnings(),
                dashboardAPI.getBestSellers(5)
            ]);
            setDashboard(dashRes.data.dashboard);
            setCourses(coursesRes.data.courses);
            setStudents(studentsRes.data.students);
            setEarnings(earningsRes.data);
            setBestSellers(bestSellersRes.data.best_sellers || []);
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to load dashboard data.' });
        } finally {
            setLoading(false);
        }
    };

    // Handle withdrawal
    const handleWithdraw = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        const amount = parseFloat(withdrawAmount);
        if (!amount || amount <= 0) {
            setMessage({ type: 'error', text: 'Enter a valid amount.' });
            return;
        }
        try {
            const response = await adminAPI.withdraw(amount);
            setMessage({ type: 'success', text: response.data.message });
            updateUser({ wallet_balance: response.data.wallet_balance });
            setWithdrawAmount('');
            fetchData();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Withdrawal failed.' });
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="container">
                <div className="loading"><div className="spinner"></div> Loading instructor dashboard...</div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="page-header">
                <h1>🧑‍🏫 Instructor Dashboard</h1>
                <p>Manage your courses, track earnings, and view student enrollments</p>
            </div>

            {message.text && (
                <div className={`alert alert-${message.type}`}>{message.text}</div>
            )}

            {/* Stats Grid */}
            {dashboard && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{dashboard.total_courses}</div>
                        <div className="stat-label">My Courses</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{dashboard.total_lessons}</div>
                        <div className="stat-label">Total Lessons</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{dashboard.total_students}</div>
                        <div className="stat-label">Students</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{dashboard.total_sales}</div>
                        <div className="stat-label">Total Sales</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value" style={{ color: 'var(--success)' }}>
                            ${dashboard.total_earnings.toFixed(2)}
                        </div>
                        <div className="stat-label">Total Earnings</div>
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {['overview', 'courses', 'students', 'earnings', 'best-sellers'].map(tab => (
                    <button
                        key={tab}
                        className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'best-sellers' ? 'Best Sellers' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                        <Link to="/instructor/course/new" className="btn btn-success btn-lg">
                            ➕ Create New Course
                        </Link>
                    </div>

                    {/* Withdrawal Card */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div className="card-body">
                            <h3>💸 Withdraw Earnings</h3>
                            <p style={{ color: 'var(--gray)', marginBottom: '1rem' }}>
                                Available balance: <strong>${user?.wallet_balance?.toFixed(2)}</strong>
                            </p>
                            <form onSubmit={handleWithdraw} style={{ display: 'flex', gap: '1rem' }}>
                                <input
                                    type="number"
                                    className="form-control"
                                    placeholder="Amount to withdraw"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    min="1"
                                    step="0.01"
                                    style={{ maxWidth: '250px' }}
                                />
                                <button type="submit" className="btn btn-warning">Withdraw</button>
                            </form>
                        </div>
                    </div>

                    {/* Recent Sales */}
                    {earnings && earnings.recent_sales.length > 0 && (
                        <div className="card">
                            <div className="card-body">
                                <h3 style={{ marginBottom: '1rem' }}>📈 Recent Sales</h3>
                                <ul className="history-list">
                                    {earnings.recent_sales.slice(0, 5).map(sale => (
                                        <li key={sale.wallet_id} className="history-item">
                                            <div>
                                                <div className="description">{sale.description}</div>
                                                <div className="date">{formatDate(sale.created_at)}</div>
                                            </div>
                                            <span className="amount add">+${sale.amount.toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Courses Tab */}
            {activeTab === 'courses' && (
                <div>
                    <div style={{ marginBottom: '1rem' }}>
                        <Link to="/instructor/course/new" className="btn btn-success">
                            ➕ Create New Course
                        </Link>
                    </div>

                    {courses.length === 0 ? (
                        <div className="empty-state">
                            <h3>No courses yet</h3>
                            <p>Create your first course and start teaching!</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Course</th>
                                        <th>Price</th>
                                        <th>Lessons</th>
                                        <th>Students</th>
                                        <th>Revenue</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {courses.map(course => (
                                        <tr key={course.course_id}>
                                            <td><strong>{course.title}</strong></td>
                                            <td>${course.price.toFixed(2)}</td>
                                            <td>{course.lesson_count}</td>
                                            <td>{course.student_count}</td>
                                            <td style={{ color: 'var(--success)' }}>${course.total_revenue.toFixed(2)}</td>
                                            <td>
                                                <span className={`badge ${course.is_published ? 'badge-free' : 'badge-locked'}`}>
                                                    {course.is_published ? 'Published' : 'Draft'}
                                                </span>
                                            </td>
                                            <td>
                                                <Link to={`/instructor/course/${course.course_id}`} className="btn btn-primary btn-sm">
                                                    Edit
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Students Tab */}
            {activeTab === 'students' && (
                <div className="card">
                    <div className="card-body">
                        <h3 style={{ marginBottom: '1rem' }}>👥 Enrolled Students</h3>
                        {students.length === 0 ? (
                            <div className="empty-state">
                                <p>No students enrolled yet.</p>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Email</th>
                                            <th>Course</th>
                                            <th>Enrolled Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map((student, idx) => (
                                            <tr key={idx}>
                                                <td><strong>{student.name}</strong></td>
                                                <td>{student.email}</td>
                                                <td>{student.course_title}</td>
                                                <td>{formatDate(student.enrolled_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Best Sellers Tab */}
            {activeTab === 'best-sellers' && (
                <div className="card">
                    <div className="card-body">
                        <h3 style={{ marginBottom: '1rem' }}>🏆 Best-Selling Courses (Platform-Wide)</h3>
                        <p style={{ color: 'var(--gray)', marginBottom: '1.5rem' }}>
                            Top-performing courses across the entire platform
                        </p>
                        {bestSellers.length === 0 ? (
                            <div className="empty-state">
                                <p>No sales data available yet.</p>
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
                                            <th>Sales</th>
                                            <th>Revenue</th>
                                            <th>Students</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bestSellers.map((course, index) => (
                                            <tr key={course.course_id}>
                                                <td>
                                                    <strong style={{ 
                                                        fontSize: '1.2rem',
                                                        color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'var(--gray)'
                                                    }}>
                                                        #{index + 1}
                                                    </strong>
                                                </td>
                                                <td><strong>{course.title}</strong></td>
                                                <td>{course.instructor_name}</td>
                                                <td>${course.course_price.toFixed(2)}</td>
                                                <td>{course.total_sales}</td>
                                                <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                                                    ${course.total_revenue.toFixed(2)}
                                                </td>
                                                <td>{course.total_students}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Earnings Tab */}
            {activeTab === 'earnings' && earnings && (
                <div>
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div className="card-body">
                            <h3>💰 Total Earnings: <span style={{ color: 'var(--success)' }}>${earnings.total_earnings.toFixed(2)}</span></h3>
                        </div>
                    </div>

                    <div className="two-col">
                        <div className="card">
                            <div className="card-body">
                                <h3 style={{ marginBottom: '1rem' }}>📊 Earnings by Course</h3>
                                {earnings.earnings_by_course.map(item => (
                                    <div key={item.course_id} className="history-item">
                                        <div>
                                            <div className="description">{item.title}</div>
                                            <div className="date">{item.total_sales} sales</div>
                                        </div>
                                        <span className="amount add">${item.total_revenue.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-body">
                                <h3 style={{ marginBottom: '1rem' }}>📈 Recent Sales</h3>
                                {earnings.recent_sales.length === 0 ? (
                                    <div className="empty-state"><p>No sales yet.</p></div>
                                ) : (
                                    <ul className="history-list">
                                        {earnings.recent_sales.map(sale => (
                                            <li key={sale.wallet_id} className="history-item">
                                                <div>
                                                    <div className="description">{sale.description}</div>
                                                    <div className="date">{formatDate(sale.created_at)}</div>
                                                </div>
                                                <span className="amount add">+${sale.amount.toFixed(2)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InstructorDashboard;
