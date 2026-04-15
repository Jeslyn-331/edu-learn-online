// ============================================================
// Courses Page
// Browse all available courses with search functionality
// ============================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { courseAPI } from '../services/api';

function Courses() {
    const [courses, setCourses] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Fetch courses on component mount and when search changes
    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async (searchTerm = '') => {
        try {
            setLoading(true);
            const response = await courseAPI.getAll(searchTerm);
            setCourses(response.data.courses);
        } catch (err) {
            setError('Failed to load courses. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle search
    const handleSearch = (e) => {
        e.preventDefault();
        fetchCourses(search);
    };

    return (
        <div className="container">
            {/* Page Header */}
            <div className="page-header">
                <h1>📚 Explore Courses</h1>
                <p>Discover courses from expert instructors and start learning today</p>
            </div>

            {/* Search Bar */}
            <form className="search-bar" onSubmit={handleSearch}>
                <input
                    type="text"
                    placeholder="Search courses by title or description..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">Search</button>
            </form>

            {/* Error State */}
            {error && <div className="alert alert-error">{error}</div>}

            {/* Loading State */}
            {loading ? (
                <div className="loading">
                    <div className="spinner"></div> Loading courses...
                </div>
            ) : courses.length === 0 ? (
                /* Empty State */
                <div className="empty-state">
                    <h3>No courses found</h3>
                    <p>Try a different search term or check back later for new courses.</p>
                </div>
            ) : (
                /* Course Grid */
                <div className="course-grid">
                    {courses.map(course => (
                        <Link to={`/courses/${course.course_id}`} key={course.course_id} style={{ textDecoration: 'none' }}>
                            <div className="card course-card">
                                {/* Course Image Placeholder */}
                                <div className="card-image">
                                    {course.title.charAt(0).toUpperCase()}
                                </div>
                                
                                <div className="card-body">
                                    <h3 className="card-title">{course.title}</h3>
                                    <p className="card-text">
                                        {course.description?.substring(0, 120)}
                                        {course.description?.length > 120 ? '...' : ''}
                                    </p>
                                    
                                    <div className="stats">
                                        <span>👨‍🏫 {course.instructor_name}</span>
                                        <span>📖 {course.lesson_count} lessons</span>
                                        <span>👥 {course.student_count} students</span>
                                    </div>

                                    <div className="card-meta">
                                        <span className="price">${course.price.toFixed(2)}</span>
                                        <span className="btn btn-primary btn-sm">View Course</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Courses;
