// src/routes/users.js
const express = require('express');
const router = express.Router();
const dbPool = require('database.js'); // Hoặc database.js
// const bcrypt = require('bcryptjs'); // Nếu bạn muốn hash password

// @route   POST api/users/register
// @desc    Đăng ký người dùng mới
// @access  Public
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ msg: 'Vui lòng nhập đầy đủ thông tin' });
    }

    try {
        // Kiểm tra xem email đã tồn tại chưa
        const [existingUsers] = await dbPool.query('SELECT email FROM users WHERE email = ?', [email]);

        if (existingUsers.length > 0) {
            return res.status(400).json({ msg: 'Người dùng đã tồn tại với email này' });
        }

        // Hash password (QUAN TRỌNG!)
        // const salt = await bcrypt.genSalt(10);
        // const hashedPassword = await bcrypt.hash(password, salt);

        // Lưu người dùng mới (trong ví dụ này, password chưa được hash)
        const [result] = await dbPool.query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            // [name, email, hashedPassword] // Sử dụng password đã hash
            [name, email, password] // Tạm thời dùng password chưa hash cho đơn giản
        );

        res.status(201).json({ msg: 'Người dùng đã được tạo', userId: result.insertId });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   GET api/users
// @desc    Lấy tất cả người dùng
// @access  Public (trong thực tế có thể cần bảo vệ)
router.get('/', async (req, res) => {
    try {
        const [users] = await dbPool.query('SELECT id, name, email, createdAt FROM users');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

module.exports = router;