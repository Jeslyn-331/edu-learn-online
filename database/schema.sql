-- ============================================================
-- EduLearn Database Schema
-- Online Course / EdTech Portal
-- ============================================================
-- This script creates all tables needed for the EduLearn system
-- Compatible with MySQL 8.0+ and Amazon RDS MySQL
-- ============================================================

-- Create the database
CREATE DATABASE IF NOT EXISTS edulearn;
USE edulearn;

-- ============================================================
-- 1. USERS TABLE
-- Stores all user accounts (students and instructors)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,              -- Stored as bcrypt hash
    role ENUM('student', 'instructor', 'admin') NOT NULL DEFAULT 'student',
    wallet_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 2. COURSES TABLE
-- Stores course information created by instructors
-- Relationship: Many courses belong to one instructor (1-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    image_url VARCHAR(500),                      -- S3 URL for course thumbnail
    instructor_id INT NOT NULL,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key: instructor_id references users table
    FOREIGN KEY (instructor_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_courses_instructor (instructor_id),
    INDEX idx_courses_published (is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 3. LESSONS TABLE
-- Stores individual lessons within courses
-- Relationship: Many lessons belong to one course (1-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS lessons (
    lesson_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,                                 -- Lesson text content
    video_url VARCHAR(500),                      -- S3 URL for lesson video
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,  -- Individual lesson price
    lesson_order INT DEFAULT 0,                  -- Order within the course
    is_preview BOOLEAN DEFAULT FALSE,            -- Free preview lesson
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key: course_id references courses table
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    INDEX idx_lessons_course (course_id),
    INDEX idx_lessons_order (lesson_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 4. ENROLLMENTS TABLE
-- Tracks which users are enrolled in which courses
-- Relationship: Many-to-many between users and courses
-- ============================================================
CREATE TABLE IF NOT EXISTS enrollments (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    
    -- Prevent duplicate enrollments
    UNIQUE KEY unique_enrollment (user_id, course_id),
    INDEX idx_enrollments_user (user_id),
    INDEX idx_enrollments_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 5. PROGRESS TABLE
-- Tracks user progress on individual lessons
-- Relationship: Many-to-many between users and lessons
-- ============================================================
CREATE TABLE IF NOT EXISTS progress (
    progress_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    lesson_id INT NOT NULL,
    status ENUM('not_started', 'in_progress', 'completed') NOT NULL DEFAULT 'not_started',
    completed_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id) ON DELETE CASCADE,
    
    -- One progress record per user per lesson
    UNIQUE KEY unique_progress (user_id, lesson_id),
    INDEX idx_progress_user (user_id),
    INDEX idx_progress_lesson (lesson_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 6. TRANSACTIONS TABLE
-- Records all financial transactions (top-ups and purchases)
-- Relationship: Many transactions belong to one user (1-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    type ENUM('top-up', 'purchase') NOT NULL,
    description VARCHAR(255),                    -- Human-readable description
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_transactions_user (user_id),
    INDEX idx_transactions_type (type),
    INDEX idx_transactions_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 7. PURCHASES TABLE
-- Records what users have purchased (lessons or courses)
-- Users can buy either a single lesson OR a full course
-- Relationship: Many purchases belong to one user (1-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS purchases (
    purchase_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    lesson_id INT NULL,                          -- NULL if purchasing a full course
    course_id INT NULL,                          -- NULL if purchasing a single lesson
    price DECIMAL(10, 2) NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id) ON DELETE SET NULL,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE SET NULL,
    
    INDEX idx_purchases_user (user_id),
    INDEX idx_purchases_lesson (lesson_id),
    INDEX idx_purchases_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 8. WALLET_HISTORY TABLE
-- Tracks all wallet balance changes (additions and deductions)
-- Relationship: Many wallet records belong to one user (1-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS wallet_history (
    wallet_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    action ENUM('add', 'deduct') NOT NULL,
    description VARCHAR(255),                    -- Reason for the change
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_wallet_user (user_id),
    INDEX idx_wallet_action (action),
    INDEX idx_wallet_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 9. CERTIFICATES TABLE (NEW)
-- Stores digital certificates issued when users complete courses
-- Relationship: Many certificates belong to one user (1-to-many)
-- Relationship: Many certificates belong to one course (1-to-many)
-- ============================================================
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

-- ============================================================
-- SEED DATA (Sample data for testing)
-- ============================================================

-- Insert sample users (password for ALL users: password123)
-- These are real bcrypt hashes - you can log in with these accounts!
INSERT INTO users (name, email, password, role, wallet_balance) VALUES
('Admin User', 'admin@edulearn.com', '$2a$10$kl.UUmYqOS/i3BRib65r6ewrkeKyLlpgi9U4saeKJu.7SxoEieNk.', 'admin', 0.00),
('John Instructor', 'john@edulearn.com', '$2a$10$kl.UUmYqOS/i3BRib65r6ewrkeKyLlpgi9U4saeKJu.7SxoEieNk.', 'instructor', 500.00),
('Jane Student', 'jane@edulearn.com', '$2a$10$kl.UUmYqOS/i3BRib65r6ewrkeKyLlpgi9U4saeKJu.7SxoEieNk.', 'student', 100.00);

-- Insert sample courses
INSERT INTO courses (title, description, price, instructor_id, is_published) VALUES
('Introduction to Web Development', 'Learn HTML, CSS, and JavaScript from scratch. Perfect for beginners who want to build websites.', 49.99, 2, TRUE),
('Advanced Python Programming', 'Master Python with advanced topics like decorators, generators, and async programming.', 79.99, 2, TRUE),
('Cloud Computing with AWS', 'Learn to deploy applications on Amazon Web Services. Covers EC2, S3, RDS, and more.', 99.99, 2, TRUE);

-- Insert sample lessons
INSERT INTO lessons (course_id, title, content, video_url, price, lesson_order, is_preview) VALUES
-- Web Development Course Lessons
(1, 'What is HTML?', 'HTML stands for HyperText Markup Language. It is the standard markup language for creating web pages.', 'https://s3.amazonaws.com/edulearn/videos/html-intro.mp4', 9.99, 1, TRUE),
(1, 'CSS Basics', 'CSS (Cascading Style Sheets) is used to style and layout web pages.', 'https://s3.amazonaws.com/edulearn/videos/css-basics.mp4', 9.99, 2, FALSE),
(1, 'JavaScript Fundamentals', 'JavaScript is a programming language that adds interactivity to websites.', 'https://s3.amazonaws.com/edulearn/videos/js-fundamentals.mp4', 14.99, 3, FALSE),
-- Python Course Lessons
(2, 'Python Decorators', 'Decorators are a powerful feature in Python that allows you to modify functions.', 'https://s3.amazonaws.com/edulearn/videos/python-decorators.mp4', 14.99, 1, TRUE),
(2, 'Generators and Iterators', 'Learn how to create memory-efficient sequences using generators.', 'https://s3.amazonaws.com/edulearn/videos/python-generators.mp4', 14.99, 2, FALSE),
(2, 'Async Programming', 'Master asynchronous programming with asyncio in Python.', 'https://s3.amazonaws.com/edulearn/videos/python-async.mp4', 19.99, 3, FALSE),
-- AWS Course Lessons
(3, 'AWS Overview', 'Introduction to Amazon Web Services and cloud computing concepts.', 'https://s3.amazonaws.com/edulearn/videos/aws-overview.mp4', 14.99, 1, TRUE),
(3, 'EC2 and Compute', 'Learn to launch and manage virtual servers with Amazon EC2.', 'https://s3.amazonaws.com/edulearn/videos/aws-ec2.mp4', 19.99, 2, FALSE),
(3, 'S3 and Storage', 'Store and retrieve files using Amazon S3 object storage.', 'https://s3.amazonaws.com/edulearn/videos/aws-s3.mp4', 19.99, 3, FALSE);

-- ============================================================
-- DATABASE RELATIONSHIP SUMMARY
-- ============================================================
-- 
-- users (1) ──────── (many) courses        [instructor creates courses]
-- users (1) ──────── (many) enrollments    [student enrolls in courses]
-- courses (1) ────── (many) enrollments    [course has many enrollments]
-- courses (1) ────── (many) lessons        [course contains many lessons]
-- users (1) ──────── (many) progress       [student tracks lesson progress]
-- lessons (1) ────── (many) progress       [lesson has progress records]
-- users (1) ──────── (many) transactions   [user has many transactions]
-- users (1) ──────── (many) purchases      [user has many purchases]
-- users (1) ──────── (many) wallet_history  [user has wallet history]
-- lessons (1) ────── (many) purchases      [lesson can be purchased]
-- courses (1) ────── (many) purchases      [course can be purchased]
--
-- Many-to-Many Relationships (via junction tables):
-- users <──> courses  (via enrollments table)
-- users <──> lessons  (via progress table)
-- ============================================================
