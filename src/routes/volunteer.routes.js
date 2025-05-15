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
            <img src="https://res.cloudinary.com/dfsj2bcpi/image/upload/v1747326737/charity_web_avatars/ipjl1n7ilir8lhinzkuh.png" alt="Logo" />
             <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; padding: 30px;">
            <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                
                <h2 style="color: #1e3d59;">🤍 Cảm ơn bạn, ${user.full_name}</h2>
                
                <p style="font-size: 16px; color: #333333;">
                    Chúng tôi rất trân trọng khi bạn đã dành thời gian và trái tim để đăng ký tham gia hoạt động:
                </p>

                <div style="background-color: #f0f3f5; padding: 15px 20px; border-left: 4px solid #1e88e5; margin: 20px 0; border-radius: 8px;">
                    <p><strong>Tên hoạt động:</strong> ${post.title}</p>
                    <p><strong>Thời gian:</strong> ${new Date(post.event_date).toLocaleDateString('vi-VN')}</p>
                    <p><strong>Địa điểm:</strong> ${post.location}</p>
                </div>

                <p style="font-size: 16px; color: #444;">
                    Sự hiện diện của bạn chính là niềm động viên to lớn cho đội ngũ tổ chức và những người đang cần giúp đỡ.
                </p>

                <p style="font-size: 16px; color: #444;">
                    Chúng tôi sẽ gửi thêm thông tin chi tiết trước ngày diễn ra hoạt động. Trong thời gian chờ đợi, nếu bạn có bất kỳ thắc mắc nào, đừng ngần ngại liên hệ:
                </p>

                <p style="font-size: 16px;">
                    📧 <a href="mailto:quocletrung5126@gmail.com" style="color: #1e88e5;">support@handsofhope.org</a><br>
                    ☎️ 0981067240 (Zalo, điện thoại)
                </p>

                <p style="font-size: 16px; color: #555; margin-top: 30px;">
                    Một lần nữa, xin chân thành cảm ơn bạn vì đã góp phần lan tỏa yêu thương và hy vọng. ❤️
                </p>

                <p style="margin-top: 40px; color: #999; font-size: 13px; border-top: 1px solid #ddd; padding-top: 20px;">
                    Email này được gửi từ hệ thống của <strong>Hands of Hope</strong>. Nếu bạn nhận được email này nhầm lẫn, vui lòng bỏ qua.
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
