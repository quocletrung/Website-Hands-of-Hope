// src/middlewares/authMiddleware.js

// Middleware kiểm tra người dùng đã đăng nhập và có phải là admin không
exports.isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        // Người dùng đã đăng nhập và là admin, cho phép tiếp tục
        return next();
    }
    // Nếu chưa đăng nhập hoặc không phải admin
    if (!req.session.user) {
        // Nếu chưa đăng nhập, chuyển hướng đến trang đăng nhập
        req.session.returnTo = req.originalUrl; // Lưu lại URL họ muốn truy cập
        return res.redirect('/login');
    }
    // Nếu đã đăng nhập nhưng không phải admin, hiển thị lỗi hoặc chuyển hướng
    res.status(403).render('error', { // Tạo một view 'error.ejs' để hiển thị lỗi
        pageTitle: 'Lỗi Truy Cập',
        message: 'Bạn không có quyền truy cập vào khu vực này.'
        // layout: 'layouts/main_layout' // Hoặc layout phù hợp
    });
};