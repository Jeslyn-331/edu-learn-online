// ============================================================
// Database Configuration
// Connects to MySQL database (local or Amazon RDS)
// Uses mysql2 with promise support for async/await
// ============================================================

const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool (better performance than single connections)
// Pool automatically manages multiple connections

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'edulearn',
    
    // Pool settings
    waitForConnections: true,   // Wait if all connections are in use
    connectionLimit: 10,        // Maximum number of connections in pool
    queueLimit: 0,              // Unlimited queue (0 = no limit)
    
    // Enable named placeholders for cleaner queries
    namedPlaceholders: true
});

// Test the database connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully!');
        console.log(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
        console.log(`   Database: ${process.env.DB_NAME}`);
        connection.release(); // Release connection back to pool
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('   Make sure MySQL is running and credentials are correct.');
        // Don't exit process - allow app to start even if DB is temporarily unavailable
    }
};

module.exports = { pool, testConnection };
