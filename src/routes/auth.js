// src/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const dbPool = require('../config/db'); // Kết nối DB pool

// Middleware kiểm tra đã đăng nhập chưa
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/auth/login');
}

// GET /auth/register - Hiển thị form đăng ký
router.get('/register', (req, res) => {
    if (req.session.user) { // Nếu đã đăng nhập, chuyển hướng về dashboard
        return res.redirect('/dashboard');
    }
    res.render('register', { error: null, success_msg: null, name: '', email: '' });
});

// POST /auth/register - Xử lý đăng ký
router.post('/register', async (req, res) => {
    const { name, email, password, confirm_password } = req.body;
    let errors = [];

    if (!name || !email || !password || !confirm_password) {
        errors.push({ msg: 'Vui lòng điền đầy đủ các trường.' });
    }

    if (password !== confirm_password) {
        errors.push({ msg: 'Mật khẩu không khớp.' });
    }

    if (password && password.length < 6) {
        errors.push({ msg: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    }

    if (errors.length > 0) {
        return res.render('register', {
            error: errors.map(err => err.msg).join('<br>'),
            success_msg: null,
            name,
            email
        });
    }

    try {
        const [existingUsers] = await dbPool.query('SELECT email FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.render('register', {
                error: 'Email này đã được đăng ký.',
                success_msg: null,
                name,
                email
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await dbPool.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);

        // req.flash('success_msg', 'Bạn đã đăng ký thành công! Vui lòng đăng nhập.'); // Cần connect-flash
        // res.redirect('/auth/login');
        res.render('register', {
            error: null,
            success_msg: 'Bạn đã đăng ký thành công! Vui lòng <a href="/auth/login">đăng nhập</a>.',
            name: '', // Clear form
            email: '' // Clear form
        });


    } catch (err) {
        console.error(err);
        res.render('register', {
            error: 'Đã có lỗi xảy ra, vui lòng thử lại.',
            success_msg: null,
            name,
            email
        });
    }
});

// GET /auth/login - Hiển thị form đăng nhập
router.get('/login', (req, res) => {
     if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('login', { error: null, email: '' });
});

// POST /auth/login - Xử lý đăng nhập
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.render('login', { error: 'Vui lòng nhập email và mật khẩu.', email });
    }

    try {
        const [users] = await dbPool.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.render('login', { error: 'Email hoặc mật khẩu không đúng.', email });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            // Lưu thông tin user vào session (không lưu password)
            req.session.user = {
                id: user.id,
                name: user.name,
                email: user.email
            };
            res.redirect('/dashboard');
        } else {
            res.render('login', { error: 'Email hoặc mật khẩu không đúng.', email });
        }
    } catch (err) {
        console.error(err);
        res.render('login', { error: 'Đã có lỗi xảy ra, vui lòng thử lại.', email });
    }
});

// POST /auth/logout - Xử lý đăng xuất
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Lỗi khi đăng xuất:", err);
            return res.redirect('/dashboard'); // Hoặc trang lỗi
        }
        res.clearCookie('connect.sid'); // Tên cookie session mặc định của express-session
        res.redirect('/auth/login');
    });
});


module.exports = { router, isAuthenticated };