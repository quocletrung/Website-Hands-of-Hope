// Trong file D:\CharityWeb\src\app.js
require('dotenv').config(); // Đặt ở dòng đầu tiên hoặc rất sớm

// --- Khai báo các module cần thiết ---
const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const sequelize = require('./config/database');
const User = require('./models/User');
const VolunteerPost = require('./models/VolunteerPost'); // Model cho bài đăng tình nguyện
const adminRoutes = require('./routes/adminRoutes'); // Đảm bảo đã bỏ comment
const VolunteerJoin = require('./models/VolunteerJoin'); // Thêm nếu chưa có

const app = express(); // Khởi tạo app Express

// --- Import các file routes ---
const profileRoutes = require('./routes/profileRoutes');
const volunteerRoutes = require('./routes/volunteer.routes'); // Route cho các hoạt động tình nguyện
// const adminRoutes = require('./routes/adminRoutes'); // Bỏ comment nếu bạn đã tạo và muốn dùng

// --- Cài đặt View Engine ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Middleware (Thứ tự quan trọng) ---

// 1. Phục vụ file tĩnh (CSS, JS client, Images từ thư mục public)
app.use(express.static(path.join(__dirname, '../public')));
console.log("Đã khởi tạo static middleware cho thư mục public.");

// 2. Đọc dữ liệu từ form (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));
console.log("Đã khởi tạo urlencoded middleware.");
app.use(express.json()); // <--- THÊM DÒNG NÀY

// 3. Cấu hình và sử dụng Express Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_very_strong_and_long_secret_key_here_please_change_me', // !!! QUAN TRỌNG: Đổi sang khóa bí mật mạnh hơn và dùng biến môi trường
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // true nếu dùng HTTPS ở production
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 1 ngày
    }
}));
console.log("Đã khởi tạo session middleware.");

// 4. Middleware để truyền thông tin user vào res.locals cho mọi template EJS
app.use((req, res, next) => {
    // console.log(`--- Request đến: ${req.method} ${req.originalUrl}`);
    // console.log("Middleware res.locals: req.session.user TRƯỚC KHI gán:", req.session.user);
    res.locals.user = req.session.user; // Gán user từ session vào biến locals
    // console.log("Middleware res.locals: res.locals.user SAU KHI gán:", res.locals.user);
    next();
});
console.log("Đã khởi tạo res.locals middleware.");
// ----------------------------------------

// --- Sử dụng các Router đã tách ---
app.use('/profile', profileRoutes);
app.use('/volunteer', volunteerRoutes); 
app.use('/admin', adminRoutes);
// Sử dụng volunteerRoutes cho các đường dẫn bắt đầu bằng /volunteer
// app.use('/admin', adminRoutes); // Bỏ comment nếu bạn đã tạo và muốn dùng adminRoutes

// --- Định nghĩa Routes còn lại trong app.js ---

// Các route GET cơ bản
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

        // Nếu đã đăng nhập thì tìm các postId mà user đã tham gia
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
app.get('/handofhope/profile', (req, res) => {
    res.render('profile', { pageTitle: 'Profile - Hands of Hope' });
});

// API cho bảng xếp hạng
app.get('/api/leaderboard', async (req, res) => {
    try {
        const topUsers = await User.findAll({
            attributes: ['id', 'username', 'full_name', 'avatar_url', 'volunpoints'],
            order: [['volunpoints', 'DESC']],
            limit: 5 // Lấy top 5 users, có thể thay đổi
        });
        res.json(topUsers);
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu bảng xếp hạng:", error);
        res.status(500).json({ message: "Lỗi máy chủ khi lấy bảng xếp hạng." });
    }
});

// Route GET trang đăng nhập
app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/handofhope/trangchu');
    }
    res.render('login', { pageTitle: 'Đăng Nhập - Hands of Hope' });
});

// Route GET trang đăng ký
app.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect('/handofhope/trangchu');
    }
    res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope' });
});

// Route GET đăng xuất
app.get('/logout', (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Lỗi khi hủy session:", err);
            return next(err);
        }
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

        const plainUser = user.get({ plain: true });
        const userDataToSave = {
            id: plainUser.id,
            username: plainUser.username,
            email: plainUser.email,
            full_name: plainUser.full_name,
            avatar_url: plainUser.avatar_url,
            bio: plainUser.bio,
            location: plainUser.location,
            volunpoints: plainUser.volunpoints,
            role: plainUser.role,
            is_active: plainUser.is_active,
            is_verified: plainUser.is_verified,
            created_at: plainUser.created_at,
            updated_at: plainUser.updated_at
        };
        req.session.user = userDataToSave;
        console.log("Đã gán vào req.session.user (khi đăng nhập):", req.session.user);

        req.session.save(err => {
            if (err) {
                console.error("Lỗi khi gọi req.session.save():", err);
                return next(err);
            }
            res.redirect('/handofhope/trangchu');
        });
    } catch (error) {
        console.error("Lỗi trong quá trình đăng nhập:", error);
        res.render('login', { pageTitle: 'Đăng Nhập - Hands of Hope', error: 'Đã có lỗi xảy ra, vui lòng thử lại.' });
    }
});

// --- Kết nối Database và Khởi động Server ---
sequelize.authenticate()
    .then(() => {
        console.log('Kết nối Sequelize thành công!');
        // { alter: true } hoặc { force: true } chỉ nên dùng trong development
        return sequelize.sync(); // Đồng bộ models với database
    })
    .then(() => {
        console.log('Đã đồng bộ model với database.');
        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`Máy chủ đang chạy tại http://localhost:${port}`);
            console.log(`Truy cập trang chủ tại http://localhost:${port}/handofhope/trangchu`);
        });
    })
    .catch(err => {
        console.error('Lỗi khởi động ứng dụng (Sequelize):', err);
        process.exit(1); // Thoát ứng dụng nếu không kết nối/đồng bộ DB được
    });