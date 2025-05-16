// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middlewares/authMiddleware'); // Middleware kiểm tra quyền admin
const User = require('../models/User');
const VolunteerPost = require('../models/VolunteerPost');
const sequelize = require('../config/database'); // Thêm dòng này
// Route chính cho trang admin, render file admin.ejs
const ExcelJS = require('exceljs');
const VolunteerJoin = require('../models/VolunteerJoin');
const nodemailer = require('nodemailer');

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
router.get('/posts', isAdmin, async (req, res) => {
    try {
        const posts = await VolunteerPost.findAll({
            include: [{ model: User, as: 'author', attributes: ['full_name', 'username', 'avatar_url'] }],
            order: [['created_at', 'DESC']]
        });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy danh sách bài đăng.' });
    }
});
// Duyệt bài
router.post('/posts/:id/approve', isAdmin, async (req, res) => {
    await VolunteerPost.update({ status: 'approved' }, { where: { id: req.params.id } });
    res.json({ success: true });
});

//đếm bài chưa duyệt
router.get('/posts/pending/count', isAdmin, async (req, res) => {
    try {
        const count = await VolunteerPost.count({
            where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('status')),
                'pending'
            )
        });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy số lượng bài chờ duyệt.' });
    }
});
// Từ chối bài
router.post('/posts/:id/reject', isAdmin, async (req, res) => {
    await VolunteerPost.update({ status: 'rejected', reason_reject: req.body.reason_reject }, { where: { id: req.params.id } });
    res.json({ success: true });
});

// Sửa bài
router.put('/posts/:id', isAdmin, async (req, res) => {
    await VolunteerPost.update(req.body, { where: { id: req.params.id } });
    res.json({ success: true });
});

// Xóa bài
router.delete('/posts/:id', isAdmin, async (req, res) => {
    const postId = req.params.id;
    // Xóa các bản ghi VolunteerJoin liên quan trước
    await VolunteerJoin.destroy({ where: { post_id: postId } });
    // Sau đó xóa bài post
    await VolunteerPost.destroy({ where: { id: postId } });
    res.json({ success: true });
});
router.get('/users', isAdmin, async (req, res) => {
    try {
        const users = await User.findAll({ order: [['created_at', 'DESC']] });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy danh sách người dùng.' });
    }
});
// Sửa thông tin user
router.put('/users/:id', isAdmin, async (req, res) => {
    await User.update(req.body, { where: { id: req.params.id } });
    res.json({ success: true });
});

// Khóa/mở khóa user
router.post('/users/:id/toggle-active', isAdmin, async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (user) {
        user.is_active = !user.is_active;
        await user.save();
        res.json({ success: true, is_active: user.is_active });
    } else {
        res.status(404).json({ message: 'Không tìm thấy user.' });
    }
});

// Xóa user
router.delete('/users/:id', isAdmin, async (req, res) => {
    const userId = req.params.id;
    // Xóa các bản ghi volunteer_joins liên quan đến user này
    await VolunteerJoin.destroy({ where: { user_id: userId } });
    // Sau đó xóa user
    await User.destroy({ where: { id: userId } });
    res.json({ success: true });
});
// Xuất Excel danh sách tham gia hoạt động
router.get('/export/posts', isAdmin, async (req, res) => {
    // Lấy dữ liệu join từ DB
    const joins = await VolunteerJoin.findAll({
        include: [
            { model: User, attributes: ['username', 'full_name'] },
            { model: VolunteerPost, attributes: ['title', 'event_date', 'location'] }
        ],
        order: [['created_at', 'DESC']]
    });

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('DanhSachThamGia');

    worksheet.columns = [
        { header: 'Username', key: 'username', width: 20 },
        { header: 'Họ tên', key: 'full_name', width: 25 },
        { header: 'Tên hoạt động', key: 'title', width: 30 },
        { header: 'Ngày tổ chức', key: 'event_date', width: 18 },
        { header: 'Địa điểm', key: 'location', width: 25 },
        { header: 'Ngày tham gia', key: 'join_date', width: 20 }
    ];

    joins.forEach(j => {
        worksheet.addRow({
            username: j.User?.username || '',
            full_name: j.User?.full_name || '',
            title: j.VolunteerPost?.title || '',
            event_date: j.VolunteerPost?.event_date ? j.VolunteerPost.event_date.toLocaleDateString('vi-VN') : '',
            location: j.VolunteerPost?.location || '',
            join_date: j.created_at ? j.created_at.toLocaleString('vi-VN') : ''
        });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=danhsach_thamgia_hoatdong.xlsx');
    await workbook.xlsx.write(res);
    res.end();
});

// Xuất Excel danh sách người dùng
router.get('/export/users', isAdmin, async (req, res) => {
    const users = await User.findAll({ order: [['created_at', 'DESC']] });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('NguoiDung');
    worksheet.columns = [
        { header: 'ID', key: 'id', width: 8 },
        { header: 'Username', key: 'username', width: 20 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Họ Tên', key: 'full_name', width: 20 },
        { header: 'Vai Trò', key: 'role', width: 10 },
        { header: 'Trạng Thái', key: 'is_active', width: 12 },
        { header: 'Ngày Tạo', key: 'created_at', width: 18 }
    ];
    users.forEach(user => {
        worksheet.addRow({
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            is_active: user.is_active ? 'Hoạt động' : 'Khóa',
            created_at: user.created_at ? user.created_at.toLocaleString('vi-VN') : ''
        });
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=nguoidung.xlsx');
    await workbook.xlsx.write(res);
    res.end();
});
router.post('/reward', isAdmin, async (req, res) => {
    const { user_id, message } = req.body;
    try {
        const user = await User.findByPk(user_id);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

        // Cấu hình transporter (có thể dùng lại cấu hình từ volunteer.routes.js)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        });

        await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: user.email,
            subject: '🌟 Thư Khen Thưởng – Ghi Nhận Đóng Góp Của Tình Nguyện Viên Tiêu Biểu',
    html: `
        <div style="font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #ffffff; padding: 30px;">
            <div style="max-width: 650px; margin: auto; border: 2px solid rgb(90, 130, 30); border-radius: 12px; padding: 40px;">

                <h2 style="color: rgb(90, 130, 30); text-align: center;">
                    🌿 THƯ VINH DANH TÌNH NGUYỆN VIÊN TIÊU BIỂU 🌿
                </h2>

                <p style="font-size: 16px; color: #333;">
                    Kính gửi <strong>${user.full_name || user.username}</strong>,
                </p>

                <p style="font-size: 16px; color: #444;">
                    Chúng tôi xin gửi đến bạn lời cảm ơn sâu sắc và lời chúc mừng trân trọng nhất vì những đóng góp không ngừng nghỉ và tinh thần thiện nguyện cao đẹp mà bạn đã thể hiện trong suốt thời gian qua.
                </p>

                <div style="margin: 25px 0; background-color: #f8fbf5; border-left: 6px solid rgb(90, 130, 30); padding: 20px; border-radius: 6px;">
                    <p style="font-size: 15px; color: #2d3e20; font-style: italic; margin: 0;">
                        ${message}
                    </p>
                </div>

                <p style="font-size: 16px; color: #444;">
                    Chúng tôi tin rằng, với trái tim nhân hậu và tinh thần cống hiến của bạn, cộng đồng sẽ ngày càng trở nên tốt đẹp và đầy ắp hy vọng.
                </p>

                <p style="font-size: 16px; color: #444;">
                    Nếu bạn có bất kỳ câu hỏi hoặc đóng góp nào, xin đừng ngần ngại liên hệ với chúng tôi:
                </p>

                <p style="font-size: 16px; color: rgb(90, 130, 30);">
                    📧 Email: <a href="mailto:quoclt.24ic@vku.udn.vn" style="color: rgb(90, 130, 30);">support@handsofhope.org</a><br>
                    ☎️ Hotline: 0981067240
                </p>

                <p style="font-size: 16px; color: #333;">
                    Trân trọng,<br>
                    <strong style="color: rgb(90, 130, 30);">Ban điều hành – Hands of Hope</strong>
                </p>

                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ccc;">

                <p style="font-size: 13px; color: gray;">
                    Đây là email tự động từ hệ thống Hands of Hope. Vui lòng không phản hồi trực tiếp qua email này.
                </p>
            </div>
        </div>
    `
        });

        res.json({ message: 'Đã gửi email khen thưởng thành công!' });
    } catch (err) {
        res.status(500).json({ message: 'Gửi email thất bại.' });
    }
});
module.exports = router;