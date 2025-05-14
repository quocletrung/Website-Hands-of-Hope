const express = require('express');
const router = express.Router();
// const VolunteerPost = require('../models/VolunteerPost');
const VolunteerJoin = require('../models/VolunteerJoin');
const { Op } = require('sequelize');
// const User = require('../models/User');
const { User, VolunteerPost } = require('../models');


// Middleware kiểm tra đăng nhập
function requireLogin(req, res, next) {
    if (!req.session.user) return res.redirect('/login');
    next();
}

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

// POST: Tham gia bài tuyển
router.post('/tham-gia/:postId', requireLogin, async (req, res) => {
    const postId = req.params.postId;
    const userId = req.session.user.id;
    // Kiểm tra đã tham gia chưa
    const existed = await VolunteerJoin.findOne({ where: { user_id: userId, post_id: postId } });
    if (!existed) {
        await VolunteerJoin.create({ user_id: userId, post_id: postId });
    }
    res.redirect('/volunteer/danh-sach');
});

// const VolunteerJoin = require('../models/VolunteerJoin'); // Đảm bảo đã có model này

// await VolunteerPost.create({
//     title, content, image_url, location, event_date,
//     created_by: req.session.user.id // Đảm bảo dòng này đúng!
// });


module.exports = router;