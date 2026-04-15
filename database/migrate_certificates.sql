-- ============================================================
-- MIGRATION: Add Certificates Table
-- Run this script if you already have the database set up
-- and just need to add the new certificates table
-- ============================================================

USE edulearn;

-- Create the certificates table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS certificates (
    certificate_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    certificate_code VARCHAR(50) NOT NULL UNIQUE,   -- Unique code like "CERT-2026-XXXX"
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_url VARCHAR(500) NULL,                     -- Optional: S3 URL for PDF certificate
    
    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    
    -- Prevent duplicate certificates for same user + course
    UNIQUE KEY unique_certificate (user_id, course_id),
    INDEX idx_certificates_user (user_id),
    INDEX idx_certificates_course (course_id),
    INDEX idx_certificates_code (certificate_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Verify the table was created
SELECT 'Certificates table created successfully!' AS status;
SHOW COLUMNS FROM certificates;
