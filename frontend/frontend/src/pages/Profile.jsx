// ============================================================
// Profile Page
// Allow users to edit their profile (name, email, password)
// ============================================================

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

function Profile() {
    const { user, updateUser } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Handle profile update
    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (!name.trim() || !email.trim()) {
            setMessage({ type: 'error', text: 'Name and email are required.' });
            return;
        }

        setSaving(true);
        try {
            const response = await authAPI.updateProfile({ name: name.trim(), email: email.trim() });
            updateUser(response.data.user);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' });
        } finally {
            setSaving(false);
        }
    };

    // Handle password change
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (!currentPassword || !newPassword || !confirmPassword) {
            setMessage({ type: 'error', text: 'All password fields are required.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }

        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
            return;
        }

        setSaving(true);
        try {
            await authAPI.changePassword({ currentPassword, newPassword });
            setMessage({ type: 'success', text: 'Password changed successfully!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to change password.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="container">
            <div className="page-header">
                <h1>👤 My Profile</h1>
                <p>Manage your account settings and preferences</p>
            </div>

            {message.text && (
                <div className={`alert alert-${message.type}`}>{message.text}</div>
            )}

            <div className="two-col">
                {/* Profile Information */}
                <div className="card">
                    <div className="card-body">
                        <h2 style={{ marginBottom: '1.5rem' }}>Profile Information</h2>
                        
                        <form onSubmit={handleUpdateProfile}>
                            <div className="form-group">
                                <label>Full Name *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your full name"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Email Address *</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Role</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={user?.role || 'student'}
                                    disabled
                                    style={{ background: 'var(--lighter-gray)', cursor: 'not-allowed' }}
                                />
                                <small style={{ color: 'var(--gray)' }}>
                                    Role cannot be changed
                                </small>
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : 'Update Profile'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Change Password */}
                <div className="card">
                    <div className="card-body">
                        <h2 style={{ marginBottom: '1.5rem' }}>Change Password</h2>
                        
                        <form onSubmit={handleChangePassword}>
                            <div className="form-group">
                                <label>Current Password *</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                />
                            </div>

                            <div className="form-group">
                                <label>New Password *</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password (min 6 characters)"
                                />
                            </div>

                            <div className="form-group">
                                <label>Confirm New Password *</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                />
                            </div>

                            <button type="submit" className="btn btn-warning" disabled={saving}>
                                {saving ? 'Changing...' : 'Change Password'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Account Info */}
            <div className="card" style={{ marginTop: '2rem' }}>
                <div className="card-body">
                    <h3 style={{ marginBottom: '1rem' }}>Account Information</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div>
                            <p style={{ color: 'var(--gray)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                Wallet Balance
                            </p>
                            <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--success)' }}>
                                ${user?.wallet_balance?.toFixed(2) || '0.00'}
                            </p>
                        </div>
                        <div>
                            <p style={{ color: 'var(--gray)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                Account Type
                            </p>
                            <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--primary)' }}>
                                {user?.role === 'instructor' ? '🧑‍🏫 Instructor' : user?.role === 'admin' ? '👑 Admin' : '👨‍🎓 Student'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile;
