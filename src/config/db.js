// src/config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'CharityWeb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection()    
    .then(connection => {
        console.log('MySQL Connected via Pool...');
        connection.release();
    })
    .catch(err => {
        console.error('Error connecting to MySQL:', err.stack);
    });

module.exports = pool;