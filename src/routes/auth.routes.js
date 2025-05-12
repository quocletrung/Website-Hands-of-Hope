// src/routes/auth.routes.js
const express = require('express');
const router = express.Router(); // Tạo một đối tượng Router mới
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const User = require('../models/User'); // Đường dẫn tới model User

// --- Định nghĩa các route trên đối tượng router ---

// POST /xu-ly-dang-nhap (Lưu ý: đường dẫn bây giờ chỉ là '/',
// vì tiền tố sẽ được định nghĩa trong app.js nếu cần)
router.post('/xu-ly-dang-nhap', async (req, res, next) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({
            where: { [Op.or]: [{ username: username }, { email: username }] }
        });

        if (!user) {
            // Thay vì render ở đây, bạn có thể chỉ trả về lỗi hoặc gọi controller
            // Tạm thời vẫn render để giống code cũ:
             return res.render('login', { pageTitle: 'Đăng Nhập - Hands of Hope', error: 'Tài khoản không tồn tại.', user: req.session.user }); // Truyền user vào đây nữa
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
             return res.render('login', { pageTitle: 'Đăng Nhập - Hands of Hope', error: 'Mật khẩu không đúng.', user: req.session.user }); // Truyền user
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            avatar_url: user.avatar_url
        };

        req.session.save(err => {
            if (err) return next(err);
            res.redirect('/handofhope/trangchu');
        });
    } catch (error) {
         console.error("Lỗi đăng nhập:", error);
         res.render('login', { pageTitle: 'Đăng Nhập - Hands of Hope', error: 'Đã có lỗi xảy ra, vui lòng thử lại.', user: req.session.user }); // Truyền user
    }
});

// POST /xu-ly-dang-ky
router.post('/xu-ly-dang-ky', async (req, res) => {
    const { username, fullname, email, password, confirm_password } = req.body;
     // --- (Toàn bộ logic xử lý đăng ký của bạn ở đây) ---
     // Ví dụ kiểm tra lỗi và render lại trang register nếu cần
     if (password !== confirm_password) {
         return res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope', error: 'Mật khẩu xác nhận không khớp.', user: req.session.user }); // Truyền user
     }
     // ... các kiểm tra khác ...
     try {
         // Hash mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10);
        // Tạo user mới
        await User.create({
            username,
            email,
            password_hash: hashedPassword,
            full_name: fullname
        });
         res.redirect('/login'); // Chuyển hướng sang trang đăng nhập
     } catch(error) {
        // Xử lý lỗi (ví dụ email/username trùng, lỗi db)
         return res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope', error: 'Có lỗi xảy ra khi đăng ký.', user: req.session.user }); // Truyền user
     }
});

 // GET /logout
 router.get('/logout', (req, res, next) => {
    req.session.destroy((err) => {
        if (err) return next(err);
        res.redirect('/login');
    });
});

// --- Xuất router để sử dụng trong app.js ---
module.exports = router;