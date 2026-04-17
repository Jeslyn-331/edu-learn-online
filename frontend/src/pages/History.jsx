// ============================================================
// History Page
// Shows completed lessons (learning history)
// ============================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { progressAPI } from '../services/api';

function History() {
    const [completedLessons, setCompletedLessons] = useState([]);
    const [inProgressLessons, setInProgressLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('in-progress');

    useEffect(() => {
        fetchProgress();
    }, []);

    const fetchProgress = async () => {
        try {
            setLoading(true);
            const response = await progressAPI.getAllProgress();
            const allProgress = response.data.progress || [];
            
            // Separate completed and in-progress lessons
            setCompletedLessons(allProgress.filter(p => p.status === 'completed'));
            setInProgressLessons(allProgress.filter(p => p.status === 'in_progress'));
        } catch (err) {
            console.error('Failed to load progress:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="container">
                <div className="loading"><div className="spinner"></div> Loading history...</div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="page-header">
                <h1>📚 Learning History</h1>
                <p>Track your learning progress and completed lessons</p>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <button
                    className={`btn ${activeTab === 'in-progress' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('in-progress')}
                >
                    📖 Current Learning ({inProgressLessons.length})
                </button>
                <button
                    className={`btn ${activeTab === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('completed')}
                >
                    ✅ Completed ({completedLessons.length})
                </button>
            </div>

            {/* In Progress Tab */}
            {activeTab === 'in-progress' && (
                <div className="card">
                    <div className="card-body">
                        <h2 style={{ marginBottom: '1rem' }}>📖 Lessons In Progress</h2>
                        {inProgressLessons.length === 0 ? (
                            <div className="empty-state">
                                <h3>No lessons in progress</h3>
                                <p>Start learning by enrolling in a course!</p>
                                <Link to="/courses" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                                    Browse Courses
                                </Link>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Lesson</th>
                                            <th>Course</th>
                                            <th>Started</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inProgressLessons.map(progress => (
                                            <tr key={progress.progress_id}>
                                                <td><strong>{progress.lesson_title}</strong></td>
                                                <td>{progress.course_title}</td>
                                                <td>{formatDate(progress.updated_at)}</td>
                                                <td>
                                                    <Link 
                                                        to={`/lessons/${progress.lesson_id}`}
                                                        className="btn btn-primary btn-sm"
                                                    >
                                                        Continue →
                                                    </Link>
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

            {/* Completed Tab */}
            {activeTab === 'completed' && (
                <div className="card">
                    <div className="card-body">
                        <h2 style={{ marginBottom: '1rem' }}>✅ Completed Lessons</h2>
                        {completedLessons.length === 0 ? (
                            <div className="empty-state">
                                <h3>No completed lessons yet</h3>
                                <p>Complete lessons to see them here!</p>
                                <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                                    Go to Dashboard
                                </Link>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Lesson</th>
                                            <th>Course</th>
                                            <th>Completed</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {completedLessons.map(progress => (
                                            <tr key={progress.progress_id}>
                                                <td>
                                                    <strong>{progress.lesson_title}</strong>
                                                    <span style={{ 
                                                        marginLeft: '0.5rem', 
                                                        color: 'var(--success)',
                                                        fontSize: '0.9rem'
                                                    }}>
                                                        ✓
                                                    </span>
                                                </td>
                                                <td>{progress.course_title}</td>
                                                <td>{formatDate(progress.completed_at)}</td>
                                                <td>
                                                    <Link 
                                                        to={`/lessons/${progress.lesson_id}`}
                                                        className="btn btn-secondary btn-sm"
                                                    >
                                                        Review
                                                    </Link>
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
        </div>
    );
}

export default History;
