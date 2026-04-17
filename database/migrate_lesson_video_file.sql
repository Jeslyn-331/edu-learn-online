-- ============================================================
-- Lesson Video Upload Migration
-- Adds uploaded MP4 support to the lessons table
-- ============================================================

USE edulearn;

ALTER TABLE lessons
ADD COLUMN video_file VARCHAR(500) NULL AFTER video_url;

-- Keep the rule simple: every lesson must have either a URL or a file.
ALTER TABLE lessons
ADD CONSTRAINT chk_lessons_video_source
CHECK (video_url IS NOT NULL OR video_file IS NOT NULL);
