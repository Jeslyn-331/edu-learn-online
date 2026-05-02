// ============================================================
// API Service
// Centralized HTTP client for all API calls
// Uses axios with automatic token attachment
// Base URL uses VITE_API_URL env var for AWS, falls back to '/api'
// for local dev (Vite proxy forwards /api → backend at port 5000)
// ============================================================

import axios from 'axios';

// Create axios instance with base URL
// Local dev: '/api' (proxied by Vite to http://localhost:5000)
// AWS prod:  set VITE_API_URL=https://your-api-domain.com/api
const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/api` 
        : '/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor - automatically attach JWT token to every request
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Let the browser set the multipart boundary for file uploads automatically.
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }

    return config;
});

// Response interceptor - handle token expiration
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid - redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ============================================================
// AUTH API CALLS
// ============================================================
export const authAPI = {
    register: (data) => API.post('/auth/register', data),
    login: (data) => API.post('/auth/login', data),
    getProfile: () => API.get('/auth/me'),
    updateProfile: (data) => API.put('/auth/profile', data),
    changePassword: (data) => API.put('/auth/password', data),
};

// ============================================================
// COURSE API CALLS
// ============================================================
export const courseAPI = {
    getAll: (search = '') => API.get(`/courses${search ? `?search=${search}` : ''}`),
    getById: (id) => API.get(`/courses/${id}`),
    create: (data) => API.post('/courses', data),
    update: (id, data) => API.put(`/courses/${id}`, data),
    delete: (id) => API.delete(`/courses/${id}`),
};

// ============================================================
// LESSON API CALLS
// ============================================================
export const lessonAPI = {
    getByCourse: (courseId) => API.get(`/lessons/course/${courseId}`),
    getById: (id) => API.get(`/lessons/${id}`),
    create: (data) => API.post('/lessons', data),
    update: (id, data) => API.put(`/lessons/${id}`, data),
    delete: (id) => API.delete(`/lessons/${id}`),
};

// ============================================================
// WALLET API CALLS
// ============================================================
export const walletAPI = {
    getBalance: () => API.get('/wallet/balance'),
    topUp: (amount) => API.post('/wallet/topup', { amount }),
    getHistory: (from, to) => {
        // Build query string with optional date filters
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        const query = params.toString();
        return API.get(`/wallet/history${query ? `?${query}` : ''}`);
    },
};

// ============================================================
// PURCHASE API CALLS
// ============================================================
export const purchaseAPI = {
    buyCourse: (courseId) => API.post(`/purchases/course/${courseId}`),
    buyLesson: (lessonId) => API.post(`/purchases/lesson/${lessonId}`),
    getAll: () => API.get('/purchases'),
};

// ============================================================
// PROGRESS API CALLS
// ============================================================
export const progressAPI = {
    getCourseProgress: (courseId) => API.get(`/progress/course/${courseId}`),
    updateProgress: (lessonId, status) => API.post(`/progress/${lessonId}`, { status }),
    getStats: () => API.get('/progress/stats'),
    getAllProgress: () => API.get('/progress/all'),
};

// ============================================================
// CERTIFICATE API CALLS
// ============================================================
export const certificateAPI = {
    getAll: () => API.get('/certificates'),
    getById: (id) => API.get(`/certificates/${id}`),
    generate: (courseId) => API.post(`/certificates/generate/${courseId}`),
    check: (courseId) => API.get(`/certificates/check/${courseId}`),
    verify: (code) => API.get(`/certificates/verify/${code}`),
};

// ============================================================
// DASHBOARD / ANALYTICS API CALLS
// ============================================================
export const dashboardAPI = {
    getBestSellers: (limit = 10) => API.get(`/dashboard/best-sellers?limit=${limit}`),
    getStats: () => API.get('/dashboard/stats'),
    getRevenue: () => API.get('/dashboard/revenue'),
};

// ============================================================
// ADMIN API CALLS
// ============================================================
export const adminAPI = {
    getDashboard: () => API.get('/admin/dashboard'),
    getCourses: () => API.get('/admin/courses'),
    getEarnings: () => API.get('/admin/earnings'),
    getStudents: () => API.get('/admin/students'),
    withdraw: (amount) => API.post('/admin/withdraw', { amount }),
};

export default API;
