// ============================================================
// S3 Utility – Optional AWS S3 integration for file uploads
//
// Behaviour:
//   - If AWS_S3_BUCKET is set in .env  → uploads go to S3
//   - If AWS_S3_BUCKET is NOT set      → uploads stay local (dev mode)
//
// This keeps local WAMP development working with zero AWS config
// while production (EC2 / Elastic Beanstalk) uses S3 automatically.
// ============================================================

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');

// Check if S3 is configured
const isS3Enabled = () => Boolean(process.env.AWS_S3_BUCKET);

// Lazy-init the S3 client only when needed
let _s3Client = null;
const getS3Client = () => {
    if (!_s3Client) {
        _s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
        });
    }
    return _s3Client;
};

// ============================================================
// Upload a local file to S3
// Returns the public S3 URL on success, or null if S3 is disabled
// ============================================================
const uploadToS3 = async (localFilePath, s3Key, contentType = 'video/mp4') => {
    if (!isS3Enabled()) return null;

    const fileBuffer = fs.readFileSync(localFilePath);
    const bucket = process.env.AWS_S3_BUCKET;

    await getS3Client().send(new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: contentType
    }));

    // Return the public URL (bucket must have public-read or CloudFront)
    return `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
};

// ============================================================
// Delete a file from S3 by its key
// Silently skips if S3 is disabled or key is empty
// ============================================================
const deleteFromS3 = async (s3Url) => {
    if (!isS3Enabled() || !s3Url) return;

    try {
        const bucket = process.env.AWS_S3_BUCKET;
        // Extract key from full S3 URL
        const urlObj = new URL(s3Url);
        const key = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;

        await getS3Client().send(new DeleteObjectCommand({
            Bucket: bucket,
            Key: key
        }));
    } catch (error) {
        console.error('S3 delete error (non-fatal):', error.message);
    }
};

// ============================================================
// Check if a video path is an S3 URL (starts with http)
// Local paths start with /uploads/
// ============================================================
const isS3Url = (videoPath) => {
    return videoPath && /^https?:\/\//i.test(videoPath);
};

module.exports = {
    isS3Enabled,
    uploadToS3,
    deleteFromS3,
    isS3Url
};
