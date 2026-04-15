// ============================================================
// Certificates Page
// Shows all earned certificates + verify certificate feature
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { certificateAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function Certificates() {
    const { user } = useAuth();
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [verifyCode, setVerifyCode] = useState('');
    const [verifyResult, setVerifyResult] = useState(null);
    const [verifying, setVerifying] = useState(false);
    const [selectedCert, setSelectedCert] = useState(null);
    const certRef = useRef(null);

    // Fetch all certificates on mount
    useEffect(() => {
        fetchCertificates();
    }, []);

    const fetchCertificates = async () => {
        try {
            setLoading(true);
            const response = await certificateAPI.getAll();
            setCertificates(response.data.certificates);
        } catch (err) {
            console.error('Failed to load certificates:', err);
        } finally {
            setLoading(false);
        }
    };

    // Verify a certificate by code
    const handleVerify = async (e) => {
        e.preventDefault();
        if (!verifyCode.trim()) return;
        setVerifying(true);
        setVerifyResult(null);
        try {
            const response = await certificateAPI.verify(verifyCode.trim());
            setVerifyResult(response.data);
        } catch (err) {
            setVerifyResult({
                valid: false,
                message: err.response?.data?.message || 'Certificate not found.'
            });
        } finally {
            setVerifying(false);
        }
    };

    // Format date nicely
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    // Print / Download certificate (opens print dialog)
    const handleDownload = (cert) => {
        setSelectedCert(cert);
        // Wait for state to update, then trigger print
        setTimeout(() => {
            window.print();
        }, 300);
    };

    if (loading) {
        return (
            <div className="container">
                <div className="loading"><div className="spinner"></div> Loading certificates...</div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="page-header">
                <h1>🎓 My Certificates</h1>
                <p>View and download your earned course completion certificates</p>
            </div>

            {/* Verify Certificate Section */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div className="card-body">
                    <h3 style={{ marginBottom: '1rem' }}>🔍 Verify a Certificate</h3>
                    <p style={{ color: 'var(--gray)', marginBottom: '1rem' }}>
                        Enter a certificate code to verify its authenticity.
                    </p>
                    <form onSubmit={handleVerify} style={{ display: 'flex', gap: '1rem' }}>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Enter certificate code (e.g., CERT-2026-A3F8B2C1)"
                            value={verifyCode}
                            onChange={(e) => setVerifyCode(e.target.value)}
                            style={{ maxWidth: '400px' }}
                        />
                        <button type="submit" className="btn btn-primary" disabled={verifying}>
                            {verifying ? 'Verifying...' : 'Verify'}
                        </button>
                    </form>

                    {/* Verification Result */}
                    {verifyResult && (
                        <div className={`alert ${verifyResult.valid ? 'alert-success' : 'alert-error'}`} style={{ marginTop: '1rem' }}>
                            {verifyResult.valid ? (
                                <div>
                                    <strong>✅ Valid Certificate!</strong>
                                    <p>Awarded to: <strong>{verifyResult.certificate.user_name}</strong></p>
                                    <p>Course: <strong>{verifyResult.certificate.course_title}</strong></p>
                                    <p>Instructor: {verifyResult.certificate.instructor_name}</p>
                                    <p>Issued: {formatDate(verifyResult.certificate.issue_date)}</p>
                                </div>
                            ) : (
                                <span>❌ {verifyResult.message}</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Certificates List */}
            {certificates.length === 0 ? (
                <div className="card">
                    <div className="card-body">
                        <div className="empty-state">
                            <h3>No certificates yet</h3>
                            <p>Complete all lessons in a course to earn your certificate!</p>
                            <Link to="/courses" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                                Browse Courses
                            </Link>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="course-grid">
                    {certificates.map(cert => (
                        <div key={cert.certificate_id} className="card">
                            {/* Certificate Preview */}
                            <div style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                padding: '2rem',
                                textAlign: 'center',
                                color: 'white',
                                position: 'relative'
                            }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎓</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.8, letterSpacing: '2px', textTransform: 'uppercase' }}>
                                    Certificate of Completion
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.5rem' }}>
                                    {cert.course_title}
                                </div>
                            </div>

                            <div className="card-body">
                                <p style={{ color: 'var(--gray)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                    Awarded to: <strong style={{ color: 'var(--dark)' }}>{cert.user_name}</strong>
                                </p>
                                <p style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>
                                    Instructor: {cert.instructor_name}
                                </p>
                                <p style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>
                                    Issued: {formatDate(cert.issue_date)}
                                </p>
                                <p style={{ 
                                    color: 'var(--primary)', 
                                    fontSize: '0.8rem', 
                                    fontFamily: 'monospace',
                                    background: 'var(--lighter-gray)',
                                    padding: '0.3rem 0.6rem',
                                    borderRadius: '4px',
                                    display: 'inline-block',
                                    marginTop: '0.5rem'
                                }}>
                                    {cert.certificate_code}
                                </p>

                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                    <button 
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleDownload(cert)}
                                    >
                                        📥 Download
                                    </button>
                                    <button 
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => {
                                            navigator.clipboard.writeText(cert.certificate_code);
                                            alert('Certificate code copied!');
                                        }}
                                    >
                                        📋 Copy Code
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Printable Certificate (hidden, shown only when printing) */}
            {selectedCert && (
                <div className="print-certificate" ref={certRef} style={{ display: 'none' }}>
                    <style>{`
                        @media print {
                            body * { visibility: hidden; }
                            .print-certificate, .print-certificate * { 
                                visibility: visible !important; 
                                display: block !important;
                            }
                            .print-certificate {
                                position: fixed;
                                left: 0; top: 0;
                                width: 100%; height: 100%;
                                background: white;
                                z-index: 9999;
                            }
                        }
                    `}</style>
                    <div style={{
                        width: '100%', height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'white', padding: '2rem'
                    }}>
                        <div style={{
                            border: '3px solid #4f46e5',
                            borderRadius: '12px',
                            padding: '3rem',
                            maxWidth: '700px',
                            width: '100%',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎓</div>
                            <h1 style={{ color: '#4f46e5', fontSize: '1.8rem', marginBottom: '0.25rem' }}>
                                Certificate of Completion
                            </h1>
                            <p style={{ color: '#64748b', marginBottom: '2rem' }}>EduLearn Online Academy</p>
                            
                            <p style={{ color: '#64748b', fontSize: '1rem' }}>This is to certify that</p>
                            <h2 style={{ color: '#1e293b', fontSize: '2rem', margin: '0.5rem 0', borderBottom: '2px solid #4f46e5', display: 'inline-block', padding: '0 1rem 0.25rem' }}>
                                {selectedCert.user_name}
                            </h2>
                            
                            <p style={{ color: '#64748b', fontSize: '1rem', marginTop: '1.5rem' }}>
                                has successfully completed the course
                            </p>
                            <h3 style={{ color: '#4f46e5', fontSize: '1.5rem', margin: '0.5rem 0' }}>
                                {selectedCert.course_title}
                            </h3>
                            
                            <p style={{ color: '#64748b', marginTop: '1.5rem' }}>
                                Instructor: <strong>{selectedCert.instructor_name}</strong>
                            </p>
                            <p style={{ color: '#64748b' }}>
                                Date: <strong>{formatDate(selectedCert.issue_date)}</strong>
                            </p>
                            
                            <div style={{ marginTop: '2rem', padding: '0.5rem', background: '#f1f5f9', borderRadius: '6px' }}>
                                <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
                                    Certificate ID: <strong>{selectedCert.certificate_code}</strong>
                                </p>
                                <p style={{ color: '#94a3b8', fontSize: '0.7rem', margin: '0.25rem 0 0' }}>
                                    Verify at: edulearn.com/verify
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Certificates;
