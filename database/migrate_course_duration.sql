-- ============================================================
-- Migration: Add duration field to courses table
-- Allows instructors to set estimated course duration
-- ============================================================

USE edulearn;

-- Add duration column to courses table (in hours)
ALTER TABLE courses 
ADD COLUMN duration INT DEFAULT NULL COMMENT 'Estimated course duration in hours';

-- Update existing courses with default duration (optional)
-- UPDATE courses SET duration = 10 WHERE duration IS NULL;


