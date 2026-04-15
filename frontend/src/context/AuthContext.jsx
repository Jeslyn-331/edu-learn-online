// ============================================================
// Authentication Context
// Provides user authentication state across the entire app
// Handles login, register, logout, and token management
// ============================================================

import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

// Create the context
const AuthContext = createContext(null);

// ============================================================
// AuthProvider Component
// Wraps the app and provides auth state to all children
// ============================================================
export function AuthProvider({ children }) {
    // State for user data and loading status
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // On app load, check if user is already logged in (token in localStorage)
    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        
        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
                // Verify token is still valid by fetching profile
                authAPI.getProfile()
                    .then(res => {
                        setUser(res.data.user);
                        localStorage.setItem('user', JSON.stringify(res.data.user));
                    })
                    .catch(() => {
                        // Token is invalid, clear everything
                        logout();
                    });
            } catch {
                logout();
            }
        }
        setLoading(false);
    }, []);

    // ============================================================
    // Login function
    // ============================================================
    const login = async (email, password) => {
        const response = await authAPI.login({ email, password });
        const { token, user: userData } = response.data;
        
        // Save token and user data to localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        
        return userData;
    };

    // ============================================================
    // Register function
    // ============================================================
    const register = async (name, email, password, role) => {
        const response = await authAPI.register({ name, email, password, role });
        const { token, user: userData } = response.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        
        return userData;
    };

    // ============================================================
    // Logout function
    // ============================================================
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    // ============================================================
    // Update user data (e.g., after wallet top-up)
    // ============================================================
    const updateUser = (updatedData) => {
        const newUser = { ...user, ...updatedData };
        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    // Value provided to all consuming components
    const value = {
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!user,
        isInstructor: user?.role === 'instructor' || user?.role === 'admin',
        isAdmin: user?.role === 'admin'
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// ============================================================
// Custom hook to use auth context
// Usage: const { user, login, logout } = useAuth();
// ============================================================
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
