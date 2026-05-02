// ============================================================
// Certificates Page
// Shows all earned certificates + verify certificate feature
// ============================================================

import { useState, useEffect } from 'react';
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
    const [copyMessage, setCopyMessage] = useState('');

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

    // Download certificate as PNG image using HTML Canvas
    const handleDownloadCertificate = (cert) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 850;
        const ctx = canvas.getContext('2d');

        // Background gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 1200, 850);
        bgGrad.addColorStop(0, '#667eea');
        bgGrad.addColorStop(1, '#764ba2');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1200, 850);

        // Inner white area
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(40, 40, 1120, 770, 16);
        ctx.fill();

        // Decorative top bar
        const barGrad = ctx.createLinearGradient(40, 40, 1160, 40);
        barGrad.addColorStop(0, '#667eea');
        barGrad.addColorStop(1, '#764ba2');
        ctx.fillStyle = barGrad;
        ctx.fillRect(40, 40, 1120, 8);

        // Title
        ctx.fillStyle = '#667eea';
        ctx.font = '16px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('EDULEARN', 600, 110);

        ctx.fillStyle = '#1a202c';
        ctx.font = 'bold 36px Georgia, serif';
        ctx.fillText('Certificate of Completion', 600, 170);

        // Divider line
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(300, 200);
        ctx.lineTo(900, 200);
        ctx.stroke();

        // "Awarded to"
        ctx.fillStyle = '#718096';
        ctx.font = '18px Arial, sans-serif';
        ctx.fillText('This certificate is proudly awarded to', 600, 260);

        // Student name
        ctx.fillStyle = '#1a202c';
        ctx.font = 'bold 40px Georgia, serif';
        ctx.fillText(cert.user_name || 'Student', 600, 320);

        // "for completing"
        ctx.fillStyle = '#718096';
        ctx.font = '18px Arial, sans-serif';
        ctx.fillText('for successfully completing the course', 600, 380);

        // Course title
        ctx.fillStyle = '#667eea';
        ctx.font = 'bold 30px Georgia, serif';
        // Truncate long course titles
        const courseTitle = cert.course_title.length > 50
            ? cert.course_title.substring(0, 50) + '...'
            : cert.course_title;
        ctx.fillText(courseTitle, 600, 430);

        // Instructor
        ctx.fillStyle = '#718096';
        ctx.font = '16px Arial, sans-serif';
        ctx.fillText(`Instructor: ${cert.instructor_name}`, 600, 490);

        // Date
        ctx.fillText(`Issued: ${formatDate(cert.issue_date)}`, 600, 530);

        // Divider line
        ctx.strokeStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(300, 570);
        ctx.lineTo(900, 570);
        ctx.stroke();

        // Certificate code
        ctx.fillStyle = '#667eea';
        ctx.font = 'bold 14px Courier New, monospace';
        ctx.fillText(`Certificate Code: ${cert.certificate_code}`, 600, 610);

        // Footer
        ctx.fillStyle = '#a0aec0';
        ctx.font = '12px Arial, sans-serif';
        ctx.fillText('This certificate verifies the completion of the above course on EduLearn.', 600, 660);
        ctx.fillText('Verify at: edulearn.com/certificates', 600, 685);

        // Decorative bottom bar
        ctx.fillStyle = barGrad;
        ctx.fillRect(40, 802, 1120, 8);

        // Download as PNG
        const link = document.createElement('a');
        link.download = `${cert.certificate_code}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
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

                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                    <button 
                                        className="btn btn-secondary btn-sm"
                                        onClick={async () => {
                                            try {
                                                await navigator.clipboard.writeText(cert.certificate_code);
                                                setCopyMessage(cert.certificate_id);
                                                setTimeout(() => setCopyMessage(''), 2000);
                                            } catch (err) {
                                                alert('Failed to copy. Please copy manually: ' + cert.certificate_code);
                                            }
                                        }}
                                    >
                                        📋 {copyMessage === cert.certificate_id ? '✓ Copied!' : 'Copy Code'}
                                    </button>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleDownloadCertificate(cert)}
                                    >
                                        📥 Download Certificate
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
}

export default Certificates;
