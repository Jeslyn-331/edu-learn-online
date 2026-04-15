// ============================================================
// App Component
// Main application with routing configuration
// ============================================================

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import LessonPage from './pages/LessonPage';
import Wallet from './pages/Wallet';
import Dashboard from './pages/Dashboard';
import InstructorDashboard from './pages/InstructorDashboard';
import ManageCourse from './pages/ManageCourse';
import Certificates from './pages/Certificates';
import Analytics from './pages/Analytics';

// ============================================================
// Protected Route Component
// Redirects to login if user is not authenticated
// ============================================================
function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
        return <div className="loading"><div className="spinner"></div> Loading...</div>;
    }
    
    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }
    
    return children;
}

// ============================================================
// Instructor Route Component
// Only allows instructors/admins
// ============================================================
function InstructorRoute({ children }) {
    const { isAuthenticated, isInstructor, loading } = useAuth();
    
    if (loading) {
        return <div className="loading"><div className="spinner"></div> Loading...</div>;
    }
    
    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }
    
    if (!isInstructor) {
        return <Navigate to="/courses" />;
    }
    
    return children;
}

// ============================================================
// Main App Component
// ============================================================
function App() {
    return (
        <div className="app">
            {/* Navigation bar shown on all pages */}
            <Navbar />
            
            {/* Route definitions */}
            <Routes>
                {/* Public routes */}
                <Route path="/" element={<Navigate to="/courses" />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/courses/:id" element={<CourseDetail />} />
                <Route path="/analytics" element={<Analytics />} />
                
                {/* Protected routes (require login) */}
                <Route path="/lessons/:id" element={
                    <ProtectedRoute><LessonPage /></ProtectedRoute>
                } />
                <Route path="/wallet" element={
                    <ProtectedRoute><Wallet /></ProtectedRoute>
                } />
                <Route path="/dashboard" element={
                    <ProtectedRoute><Dashboard /></ProtectedRoute>
                } />
                <Route path="/certificates" element={
                    <ProtectedRoute><Certificates /></ProtectedRoute>
                } />
                
                {/* Instructor-only routes */}
                <Route path="/instructor" element={
                    <InstructorRoute><InstructorDashboard /></InstructorRoute>
                } />
                <Route path="/instructor/course/new" element={
                    <InstructorRoute><ManageCourse /></InstructorRoute>
                } />
                <Route path="/instructor/course/:id" element={
                    <InstructorRoute><ManageCourse /></InstructorRoute>
                } />
                
                {/* 404 - Redirect to courses */}
                <Route path="*" element={<Navigate to="/courses" />} />
            </Routes>
        </div>
    );
}

export default App;
