require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const sequelize = require('./config/database');
const User = require('./models/User');
const VolunteerPost = require('./models/VolunteerPost');
const VolunteerJoin = require('./models/VolunteerJoin');
const adminRoutes = require('./routes/adminRoutes');
const profileRoutes = require('./routes/profileRoutes');
const volunteerRoutes = require('./routes/volunteer.routes');

const app = express();

// --- Cài đặt View Engine ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Middleware ---
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'your_very_strong_and_long_secret_key_here_please_change_me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24
    }
}));

// Truyền user vào res.locals cho mọi template
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

// --- Sử dụng router ---
app.use('/profile', profileRoutes);
app.use('/volunteer', volunteerRoutes);
app.use('/admin', adminRoutes);

// --- Định nghĩa Routes ---
app.get('/handofhope/trangchu', (req, res) => {
    res.render('trangchu', { pageTitle: 'Trang Chủ - Hands of Hope' });
});

app.get('/handofhope/gioi-thieu', (req, res) => {
    res.render('gioithieu', { pageTitle: 'Giới Thiệu - Hands of Hope' });
});

app.get('/handofhope/hanh-trinh', async (req, res) => {
    try {
        const posts = await VolunteerPost.findAll({
            where: { status: 'approved' },
            order: [['created_at', 'DESC']],
            include: [
                { model: User, as: 'author', attributes: ['full_name', 'avatar_url'] }
            ]
        });

        let joinedPostIds = [];
        if (req.session.user) {
            const joins = await VolunteerJoin.findAll({
                where: { user_id: req.session.user.id }
            });
            joinedPostIds = joins.map(j => j.post_id);
        }

        res.render('hanhtrinh', {
            pageTitle: 'Hành Trình - Hands of Hope',
            posts,
            joinedPostIds,
            success_msg: req.query.success_msg,
            error_msg: req.query.error_msg
        });
    } catch (error) {
        console.error("Lỗi khi lấy bài đăng hành trình:", error);
        res.status(500).render('hanhtrinh', {
            pageTitle: 'Hành Trình - Hands of Hope',
            posts: [],
            error_msg: 'Không thể tải danh sách bài đăng.'
        });
    }
});

app.get('/handofhope/lien-he', (req, res) => {
    res.render('lienhe', { pageTitle: 'Liên Hệ - Hands of Hope' });
});

app.get('/handofhope/quyen-gop', (req, res) => {
    res.render('quyengop', { pageTitle: 'Quyên Góp - Hands of Hope' });
});

// Route GET trang đăng nhập
app.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/handofhope/trangchu');
    res.render('login', { pageTitle: 'Đăng Nhập - Hands of Hope' });
});

// Route GET trang đăng ký
app.get('/register', (req, res) => {
    if (req.session.user) return res.redirect('/handofhope/trangchu');
    res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope' });
});

// Route GET đăng xuất
app.get('/logout', (req, res, next) => {
    req.session.destroy((err) => {
        if (err) return next(err);
        res.redirect('/login');
    });
});

// Route POST xử lý đăng ký
app.post('/xu-ly-dang-ky', async (req, res, next) => {
    const { username, fullname, email, password, confirm_password } = req.body;
    if (password !== confirm_password) {
        return res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope', error: 'Mật khẩu xác nhận không khớp.' });
    }
    try {
        const existingUserEmail = await User.findOne({ where: { email } });
        if (existingUserEmail) {
            return res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope', error: 'Email đã được sử dụng.' });
        }
        const existingUsername = await User.findOne({ where: { username } });
        if (existingUsername) {
            return res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope', error: 'Tên đăng nhập đã được sử dụng.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({
            username,
            email,
            password_hash: hashedPassword,
            full_name: fullname
        });
        res.redirect('/login');
    } catch (error) {
        console.error("Lỗi trong quá trình đăng ký:", error);
        res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope', error: 'Đã có lỗi xảy ra trong quá trình đăng ký.' });
    }
});

// Route POST xử lý đăng nhập
app.post('/xu-ly-dang-nhap', async (req, res, next) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({
            where: { [Op.or]: [{ username: username }, { email: username }] }
        });
        if (!user) {
            return res.render('login', { pageTitle: 'Đăng Nhập - Hands of Hope', error: 'Tài khoản không tồn tại.' });
        }
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.render('login', { pageTitle: 'Đăng Nhập - Hands of Hope', error: 'Mật khẩu không đúng.' });
        }
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
            bio: user.bio,
            location: user.location,
            volunpoints: user.volunpoints,
            role: user.role,
            is_active: user.is_active,
            is_verified: user.is_verified,
            created_at: user.created_at,
            updated_at: user.updated_at
        };
        req.session.save(err => {
            if (err) return next(err);
            res.redirect('/handofhope/trangchu');
        });
    } catch (error) {
        console.error("Lỗi trong quá trình đăng nhập:", error);
        res.render('login', { pageTitle: 'Đăng Nhập - Hands of Hope', error: 'Đã có lỗi xảy ra, vui lòng thử lại.' });
    }
});


// API cho bảng xếp hạng
app.get('/api/leaderboard', async (req, res) => {
    try {
        const topUsers = await User.findAll({
            attributes: ['id', 'username', 'full_name', 'avatar_url', 'volunpoints'],
            order: [['volunpoints', 'DESC']],
            limit: 5
        });
        res.json(topUsers);
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu bảng xếp hạng:", error);
        res.status(500).json({ message: "Lỗi máy chủ khi lấy bảng xếp hạng." });
    }
});

// --- Kết nối Database và Khởi động Server ---
sequelize.authenticate()
    .then(() => sequelize.sync())
    .then(() => {
        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`Máy chủ đang chạy tại http://localhost:${port}`);
            console.log(`Truy cập trang chủ tại http://localhost:${port}/handofhope/trangchu`);
        });
    })
    .catch(err => {
        console.error('Lỗi khởi động ứng dụng (Sequelize):', err);
        process.exit(1);
    });