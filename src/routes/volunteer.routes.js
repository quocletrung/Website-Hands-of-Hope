const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User, VolunteerPost } = require('../models');
const VolunteerJoin = require('../models/VolunteerJoin');
const nodemailer = require('nodemailer');

// Middleware kiểm tra đăng nhập
function requireLogin(req, res, next) {
    if (!req.session.user) return res.redirect('/login');
    next();
}

// Cấu hình Nodemailer với Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

// GET: Form đăng bài
router.get('/dang-bai', requireLogin, (req, res) => {
    res.render('volunteer_post_form', { pageTitle: 'Đăng bài tuyển tình nguyện viên' });
});

// POST: Xử lý đăng bài
router.post('/dang-bai', requireLogin, async (req, res) => {
    const { title, content, image_url, location, event_date } = req.body;
    try {
        await VolunteerPost.create({
            title,
            content,
            image_url,
            location,
            event_date,
            created_by: req.session.user.id
        });
        res.redirect('/handofhope/hanh-trinh?success_msg=' + encodeURIComponent('Đăng bài thành công!'));
    } catch (error) {
        console.error("Lỗi khi đăng bài tình nguyện:", error);
        res.redirect('/handofhope/hanh-trinh?error_msg=' + encodeURIComponent('Đăng bài thất bại. Vui lòng thử lại!'));
    }
});

// GET: Danh sách bài tuyển
router.get('/danh-sach', async (req, res) => {
    const posts = await VolunteerPost.findAll({
        order: [['created_at', 'DESC']],
        include: [
            { model: User, as: 'author', attributes: ['full_name', 'avatar_url'] }
        ]
    });
    res.render('volunteer_list', { posts, pageTitle: 'Danh sách bài tuyển tình nguyện viên' });
});

// POST: Tham gia bài tuyển và gửi email
router.post('/tham-gia/:postId', requireLogin, async (req, res) => {
    const postId = req.params.postId;
    const userId = req.session.user.id;

    try {
        // Kiểm tra đã tham gia chưa
        const existed = await VolunteerJoin.findOne({ where: { user_id: userId, post_id: postId } });
        if (existed) {
            return res.redirect('/handofhope/hanh-trinh?error_msg=' + encodeURIComponent('Bạn đã tham gia hoạt động này.'));
        }

        // Tạo bản ghi tham gia
        await VolunteerJoin.create({ user_id: userId, post_id: postId });

        // Lấy thông tin người dùng
        const user = await User.findByPk(userId);
        // Lấy thông tin bài viết
        const post = await VolunteerPost.findByPk(postId);

        // Gửi email xác nhận
        await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: user.email,
            subject: `Xác nhận tham gia hoạt động: ${post.title}`,
    html: `
        <div style="font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #ffffff; padding: 30px;">
            <div style="max-width: 650px; margin: auto; border: 2px solid rgb(90, 130, 30); border-radius: 12px; padding: 40px;">
                
                <div style="text-align: center; margin-bottom: 30px;">
                    <img src="https://res.cloudinary.com/dfsj2bcpi/image/upload/v1747326737/charity_web_avatars/ipjl1n7ilir8lhinzkuh.png" alt="Hands of Hope Logo" style="height: 80px;" />
                </div>

                <h2 style="color: rgb(90, 130, 30); text-align: center;">
                    🤝 XÁC NHẬN THAM GIA HOẠT ĐỘNG
                </h2>

                <p style="font-size: 16px; color: #333;">
                    Kính gửi <strong>${user.full_name}</strong>,
                </p>

                <p style="font-size: 16px; color: #444;">
                    Chúng tôi xin chân thành cảm ơn bạn vì đã đăng ký tham gia vào hoạt động dưới đây. Sự hiện diện của bạn là niềm vinh dự lớn đối với đội ngũ tổ chức và cộng đồng chúng ta.
                </p>

                <div style="margin: 25px 0; background-color: #f8fbf5; border-left: 6px solid rgb(90, 130, 30); padding: 20px; border-radius: 6px;">
                    <p><strong>Tên hoạt động:</strong> ${post.title}</p>
                    <p><strong>Thời gian:</strong> ${new Date(post.event_date).toLocaleDateString('vi-VN')}</p>
                    <p><strong>Địa điểm:</strong> ${post.location}</p>
                </div>

                <p style="font-size: 16px; color: #444;">
                    Mọi thông tin chi tiết hơn sẽ được chúng tôi cập nhật trước ngày diễn ra hoạt động. Trong thời gian chờ đợi, nếu bạn có bất kỳ câu hỏi hoặc cần hỗ trợ, xin vui lòng liên hệ với chúng tôi qua:
                </p>

                <p style="font-size: 16px; color: rgb(90, 130, 30);">
                    📧 Email: <a href="mailto:support@handsofhope.org" style="color: rgb(90, 130, 30);">support@handsofhope.org</a><br>
                    ☎️ Zalo/Điện thoại: 0981067240
                </p>

                <p style="font-size: 16px; color: #333; margin-top: 30px;">
                    Một lần nữa, xin chân thành cảm ơn bạn vì đã góp phần lan tỏa yêu thương và mang lại hy vọng cho cộng đồng. Chúng tôi rất mong chờ được gặp bạn tại sự kiện!
                </p>

                <p style="margin-top: 40px; font-size: 16px; color: rgb(90, 130, 30);">
                    Trân trọng,<br>
                    <strong>Ban tổ chức – Hands of Hope</strong>
                </p>

                <hr style="margin: 40px 0; border: none; border-top: 1px solid #ccc;" />
                <p style="font-size: 13px; color: gray;">
                    Email này được gửi từ hệ thống của <strong>Hands of Hope</strong>. Nếu bạn nhận được email này nhầm lẫn, xin vui lòng bỏ qua.
                </p>
            </div>
        </div>
    `
        });

        res.redirect('/handofhope/hanh-trinh?success_msg=' + encodeURIComponent('Bạn đã tham gia hoạt động! Email xác nhận đã được gửi tới.'));
    } catch (error) {
        console.error("Lỗi khi tham gia hoạt động:", error);
        res.redirect('/handofhope/hanh-trinh?error_msg=' + encodeURIComponent('Đã xảy ra lỗi khi tham gia.'));
    }
});

module.exports = router;
