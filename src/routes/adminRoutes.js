// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middlewares/authMiddleware'); // Middleware kiểm tra quyền admin

// Route chính cho trang admin, render file admin.ejs
router.get('/', isAdmin, (req, res) => {
    // Giả sử file giao diện admin của bạn là 'admin.ejs' và nằm trong 'src/views/'
    // Nếu bạn đặt trong thư mục con 'src/views/admin/dashboard.ejs' chẳng hạn,
    // thì đổi thành 'admin/dashboard'
    res.render('admin', {
        pageTitle: 'Trang Quản Trị - Hands of Hope',
        // Bạn có thể truyền thêm các dữ liệu cần thiết cho trang admin ở đây
        // layout: 'layouts/admin_layout' // Nếu bạn dùng layout riêng cho admin
    });
});

router.get('/', isAdmin, (req, res) => {
    res.render('admin', { pageTitle: 'Trang Quản Trị' /*, layout: 'layouts/admin_layout' */ });
});

module.exports = router;