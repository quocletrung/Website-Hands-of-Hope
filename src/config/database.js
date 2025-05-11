// src/config/db.js (hoặc database.js)
const mysql = require('mysql2/promise'); // Sử dụng phiên bản promise
require('dotenv').config(); // Để lấy thông tin từ .env

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root', // User mặc định của XAMPP thường là 'root'
    password: process.env.DB_PASSWORD || '', // Mật khẩu mặc định của XAMPP thường là trống
    database: process.env.DB_NAME || 'CharityWeb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Kiểm tra kết nối (tùy chọn)
pool.getConnection()
    .then(connection => {
        console.log('Kết nối MySQL thành công với ID thread:', connection.threadId);
        connection.release(); // Trả connection về pool
    })
    .catch(err => {
        console.error('Không thể kết nối tới MySQL:', err);
    });

module.exports = pool;