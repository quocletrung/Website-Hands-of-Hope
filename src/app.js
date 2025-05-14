<<<<<<< HEAD
=======
// Trong file D:\CharityWeb\src\app.js
require('dotenv').config(); // Đặt ở dòng đầu tiên hoặc rất sớm
>>>>>>> 2f25b7013a7ba6787481816e3bb89d0800b4bea3
// --- Khai báo các module cần thiết ---
const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const sequelize = require('./config/database');
const User = require('./models/User');
const VolunteerPost = require('./models/VolunteerPost');
const volunteerRoutes = require('./routes/volunteer.routes');

const app = express(); // <-- Đặt trước khi dùng app.use, app.get, ...

// Các module này có thể cần thiết nếu các route khác trong app.js cũng dùng
// Nếu chỉ dùng cho profile (đã chuyển sang profileRoutes.js), bạn có thể xem xét xóa ở đây
// const multer = require('multer'); // Đã chuyển sang profileRoutes.js
// const cloudinary = require('./config/cloudinary.config.js'); // Đã chuyển sang profileRoutes.js
// const fs = require('fs'); // Đã chuyển sang profileRoutes.js

// --- Import các file routes ---
const profileRoutes = require('./routes/profileRoutes');

// --- Cài đặt View Engine ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Middleware ---
app.use(express.static(path.join(__dirname, '../public')));
<<<<<<< HEAD
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: '0981067240',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
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
app.use('/volunteer', volunteerRoutes);

// --- Định nghĩa Routes ---
app.get('/handofhope/trangchu', (req, res) => {
=======
console.log("Đã khởi tạo static middleware cho thư mục public.");

// 2. Đọc dữ liệu từ form (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));
console.log("Đã khởi tạo urlencoded middleware.");

// 3. Cấu hình và sử dụng Express Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_strong_secret_key_here', // !!! QUAN TRỌNG: Đổi sang khóa bí mật mạnh hơn và dùng biến môi trường
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
    res.locals.user = req.session.user;
    // console.log("Middleware res.locals: res.locals.user SAU KHI gán:", res.locals.user);
    next();
});
console.log("Đã khởi tạo res.locals middleware.");
// ----------------------------------------

// --- Sử dụng các Router đã tách ---
app.use('/profile', profileRoutes);

// --- Định nghĩa Routes còn lại trong app.js ---

// Các route GET cơ bản
app.get('/handofhope/trangchu', (req, res) => {
    // console.log("\n--- Xử lý GET /handofhope/trangchu ---");
    // console.log("Render trangchu: res.locals.user là:", res.locals.user);
    // console.log("Render trangchu: req.session.user là:", req.session.user);
>>>>>>> 2f25b7013a7ba6787481816e3bb89d0800b4bea3
    res.render('trangchu', { pageTitle: 'Trang Chủ - Hands of Hope' });
});
app.get('/handofhope/gioi-thieu', (req, res) => {
    res.render('gioithieu', { pageTitle: 'Giới Thiệu - Hands of Hope' });
});
app.get('/handofhope/hanh-trinh', async (req, res) => {
    const posts = await VolunteerPost.findAll({
        order: [['created_at', 'DESC']],
        include: [
            { model: User, as: 'author', attributes: ['full_name', 'avatar_url'] }
        ]
    });
    res.render('hanhtrinh', { pageTitle: 'Hành Trình - Hands of Hope', posts });
});
app.get('/handofhope/lien-he', (req, res) => {
    res.render('lienhe', { pageTitle: 'Liên Hệ - Hands of Hope' });
});
app.get('/handofhope/quyen-gop', (req, res) => {
    res.render('quyengop', { pageTitle: 'Quyên Góp - Hands of Hope' });
});
app.get('/api/leaderboard', async (req, res) => { // Hoặc router.get(...) nếu là file riêng
    try {
        const topUsers = await User.findAll({
            attributes: ['id', 'username', 'full_name', 'avatar_url', 'volunpoints'], // Chỉ lấy các trường cần thiết
            order: [['volunpoints', 'DESC']], // Sắp xếp giảm dần theo volunpoints
            limit: 5 // Lấy top 10 users, bạn có thể thay đổi số lượng
        });
        res.json(topUsers);
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu bảng xếp hạng:", error);
        res.status(500).json({ message: "Lỗi máy chủ khi lấy bảng xếp hạng." });
    }
});

app.get('/handofhope/profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    // Route này đang render cùng view 'profile.ejs'
    // Nó sẽ sử dụng `res.locals.user` được set từ session.
    // Nếu muốn dữ liệu ở đây luôn mới nhất, cần query DB như trong profileRoutes.js gợi ý
    res.render('profile', {
        pageTitle: 'Profile - Hands of Hope',
        // user đã có từ res.locals.user
    });
});

// Route GET trang đăng nhập
app.get('/login', (req, res) => {
<<<<<<< HEAD
    if (req.session.user) return res.redirect('/handofhope/trangchu');
=======
    if (req.session.user) {
        // console.log("User đã đăng nhập, chuyển hướng từ /login về trang chủ.");
        return res.redirect('/handofhope/trangchu');
    }
    // console.log("Hiển thị trang đăng nhập.");
>>>>>>> 2f25b7013a7ba6787481816e3bb89d0800b4bea3
    res.render('login', { pageTitle: 'Đăng Nhập - Hands of Hope' });
});

// Route GET trang đăng ký
app.get('/register', (req, res) => {
<<<<<<< HEAD
    if (req.session.user) return res.redirect('/handofhope/trangchu');
=======
    if (req.session.user) {
        // console.log("User đã đăng nhập, chuyển hướng từ /register về trang chủ.");
        return res.redirect('/handofhope/trangchu');
    }
    // console.log("Hiển thị trang đăng ký.");
>>>>>>> 2f25b7013a7ba6787481816e3bb89d0800b4bea3
    res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope' });
});

// Route GET đăng xuất
app.get('/logout', (req, res, next) => {
<<<<<<< HEAD
    req.session.destroy((err) => {
        if (err) return next(err);
=======
    // console.log("\n--- Xử lý GET /logout ---");
    req.session.destroy((err) => {
        if (err) {
            console.error("!!! Lỗi khi hủy session:", err);
            return next(err);
        }
        // console.log("Session đã được hủy. Chuyển hướng về /login.");
>>>>>>> 2f25b7013a7ba6787481816e3bb89d0800b4bea3
        res.redirect('/login');
    });
});

// Route POST xử lý đăng ký
app.post('/xu-ly-dang-ky', async (req, res, next) => {
    const { username, fullname, email, password, confirm_password } = req.body;
<<<<<<< HEAD
    if (password !== confirm_password) {
=======
    // console.log(`\n--- Bắt đầu xử lý POST /xu-ly-dang-ky cho email: ${email}`);

    if (password !== confirm_password) {
        // console.log("Đăng ký thất bại: Mật khẩu không khớp.");
>>>>>>> 2f25b7013a7ba6787481816e3bb89d0800b4bea3
        return res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope', error: 'Mật khẩu xác nhận không khớp.' });
    }
    try {
        const existingUserEmail = await User.findOne({ where: { email } });
        if (existingUserEmail) {
<<<<<<< HEAD
=======
            // console.log("Đăng ký thất bại: Email đã tồn tại.");
>>>>>>> 2f25b7013a7ba6787481816e3bb89d0800b4bea3
            return res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope', error: 'Email đã được sử dụng.' });
        }
        const existingUsername = await User.findOne({ where: { username } });
        if (existingUsername) {
<<<<<<< HEAD
            return res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope', error: 'Tên đăng nhập đã được sử dụng.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
=======
            // console.log("Đăng ký thất bại: Tên đăng nhập đã tồn tại.");
            return res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope', error: 'Tên đăng nhập đã được sử dụng.' });
        }

        // console.log("Đang hash mật khẩu...");
        const hashedPassword = await bcrypt.hash(password, 10);
        // console.log("Hash mật khẩu thành công. Đang tạo user...");

>>>>>>> 2f25b7013a7ba6787481816e3bb89d0800b4bea3
        await User.create({
            username,
            email,
            password_hash: hashedPassword,
            full_name: fullname
            // Các trường như bio, location, volunpoints sẽ có giá trị mặc định từ DB hoặc NULL
        });
<<<<<<< HEAD
=======
        // console.log(`Tạo user ${username} thành công. Chuyển hướng về /login.`);
>>>>>>> 2f25b7013a7ba6787481816e3bb89d0800b4bea3
        res.redirect('/login');
    } catch (error) {
<<<<<<< HEAD
=======
        console.error("!!! LỖI trong khối try...catch của /xu-ly-dang-ky:", error);
>>>>>>> 2f25b7013a7ba6787481816e3bb89d0800b4bea3
        res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope', error: 'Đã có lỗi xảy ra trong quá trình đăng ký.' });
    }
});

// Route POST xử lý đăng nhập
app.post('/xu-ly-dang-nhap', async (req, res, next) => {
    const { username, password } = req.body;
<<<<<<< HEAD
=======
    // console.log(`\n--- Bắt đầu xử lý POST /xu-ly-dang-nhap cho: ${username}`);

>>>>>>> 2f25b7013a7ba6787481816e3bb89d0800b4bea3
    try {
        const user = await User.findOne({
            where: { [Op.or]: [{ username: username }, { email: username }] }
        });
        if (!user) {
<<<<<<< HEAD
            return res.render('login', { pageTitle: 'Đăng Nhập - Hands of Hope', error: 'Tài khoản không tồn tại.' });
        }
=======
            // console.log("Đăng nhập thất bại: Tài khoản không tồn tại.");
            return res.render('login', { pageTitle: 'Đăng Nhập - Hands of Hope', error: 'Tài khoản không tồn tại.' });
        }

        // console.log(`Tìm thấy user: ${user.username}. Đang so sánh mật khẩu...`);
>>>>>>> 2f25b7013a7ba6787481816e3bb89d0800b4bea3
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
<<<<<<< HEAD
            return res.render('login', { pageTitle: 'Đăng Nhập - Hands of Hope', error: 'Mật khẩu không đúng.' });
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
=======
            // console.log("Đăng nhập thất bại: Mật khẩu không đúng cho user:", user.username);
            return res.render('login', { pageTitle: 'Đăng Nhập - Hands of Hope', error: 'Mật khẩu không đúng.' });
        }

        // console.log(`Đăng nhập thành công cho user: ${user.username}`);

        // --- !!! SỬA ĐỔI QUAN TRỌNG Ở ĐÂY !!! ---
        // Lấy tất cả các trường cần thiết từ đối tượng `user` (Sequelize instance)
        // để lưu vào session. `user.get({ plain: true })` sẽ trả về một object thuần túy.
        const plainUser = user.get({ plain: true });

        // Chọn lọc các trường bạn muốn lưu vào session để tránh lưu quá nhiều dữ liệu không cần thiết
        // hoặc dữ liệu nhạy cảm (dù password_hash không có ở đây).
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
            is_verified: plainUser.is_verified, // Thêm nếu cần
            created_at: plainUser.created_at, // Chuyển thành string nếu cần xử lý đặc biệt
            updated_at: plainUser.updated_at  // Chuyển thành string nếu cần xử lý đặc biệt
            // Thêm bất kỳ trường nào khác bạn muốn có sẵn trong session cho trang profile
        };
        // --- KẾT THÚC SỬA ĐỔI ---

        req.session.user = userDataToSave;
        console.log("Đã gán vào req.session.user (khi đăng nhập):", req.session.user);

        // console.log("Chuẩn bị gọi req.session.save()...");
        req.session.save(err => {
            if (err) {
                console.error("!!! LỖI khi gọi req.session.save():", err);
                return next(err);
            }
            // console.log(">>> req.session.save() thành công. Đang chuyển hướng về /handofhope/trangchu...");
            res.redirect('/handofhope/trangchu');
        });

    } catch (error) {
        console.error("!!! LỖI trong khối try...catch của /xu-ly-dang-nhap:", error);
>>>>>>> 2f25b7013a7ba6787481816e3bb89d0800b4bea3
        res.render('login', { pageTitle: 'Đăng Nhập - Hands of Hope', error: 'Đã có lỗi xảy ra, vui lòng thử lại.' });
    }
});

// --- Kết nối Database và Khởi động Server ---
sequelize.authenticate()
    .then(() => {
<<<<<<< HEAD
        return sequelize.sync();
    })
    .then(() => {
=======
        console.log('Kết nối Sequelize thành công!');
        return sequelize.sync(); // { alter: true } nếu cần cập nhật schema không phá hủy dữ liệu
    })
    .then(() => {
        console.log('Đã đồng bộ model với database.');
>>>>>>> 2f25b7013a7ba6787481816e3bb89d0800b4bea3
        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`Máy chủ đang chạy tại http://localhost:${port}`);
            console.log(`Truy cập trang chủ tại http://localhost:${port}/handofhope/trangchu`);
        });
    })
    .catch(err => {
        console.error('Lỗi khởi động ứng dụng (Sequelize):', err);
        process.exit(1);
<<<<<<< HEAD
    });

=======
    });
>>>>>>> 2f25b7013a7ba6787481816e3bb89d0800b4bea3
