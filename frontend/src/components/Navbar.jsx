// ============================================================
// Navbar Component
// Navigation bar with links based on user role
// ============================================================

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
    const { user, isAuthenticated, isInstructor, logout } = useAuth();
    const navigate = useNavigate();

    // Handle logout
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="navbar-content">
                {/* Brand / Logo */}
                <Link to="/courses" className="navbar-brand">
                    📚 Edu<span>Learn</span>
                </Link>

                {/* Navigation Links */}
                <div className="navbar-links">
                    {/* Always visible */}
                    <Link to="/courses">Courses</Link>

                    {isAuthenticated ? (
                        <>
                            {/* Logged-in user links */}
                            <Link to="/dashboard">My Learning</Link>
                            <Link to="/certificates">🎓 Certificates</Link>
                            <Link to="/wallet">
                                💰 <span className="wallet-badge">${user?.wallet_balance?.toFixed(2) || '0.00'}</span>
                            </Link>

                            {/* Instructor-only links */}
                            {isInstructor && (
                                <Link to="/instructor">Instructor Panel</Link>
                            )}

                            {/* User info and logout */}
                            <span className="user-name">👤 {user?.name}</span>
                            <button onClick={handleLogout}>Logout</button>
                        </>
                    ) : (
                        <>
                            {/* Guest links */}
                            <Link to="/login">Login</Link>
                            <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
