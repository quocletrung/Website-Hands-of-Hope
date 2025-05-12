// Trong file D:\CharityWeb\src\app.js

// --- Khai báo các module cần thiết ---
const express = require('express');
const path = require('path');
const session = require('express-session'); // Module quản lý session
const bcrypt = require('bcryptjs');         // Module mã hóa mật khẩu
const { Op } = require('sequelize');        // Toán tử cho Sequelize (vd: OR)
const sequelize = require('./config/database'); // Cấu hình kết nối DB
const User = require('./models/User');          // Model User

const app = express();

// --- Cài đặt View Engine ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Đường dẫn tới thư mục views

// --- Middleware (Thứ tự quan trọng) ---

// 1. Phục vụ file tĩnh (CSS, JS client, Images từ thư mục public)
app.use(express.static(path.join(__dirname, '../public')));
console.log("Đã khởi tạo static middleware cho thư mục public."); // Log tĩnh

// 2. Đọc dữ liệu từ form (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true })); // Chỉ cần gọi một lần
console.log("Đã khởi tạo urlencoded middleware."); // Log tĩnh

// 3. Cấu hình và sử dụng Express Session
app.use(session({
    secret: '0981067240', // !!! QUAN TRỌNG: Đổi sang khóa bí mật mạnh hơn và dùng biến môi trường
    resave: false,          // Không lưu lại session nếu không có thay đổi
    saveUninitialized: false, // Không tạo session cho đến khi có gì đó được lưu
    cookie: {
        secure: false,      // Đặt là true nếu dùng HTTPS ở môi trường production
        httpOnly: true,     // Giúp chống XSS, cookie không thể truy cập bằng JS phía client
        maxAge: 1000 * 60 * 60 * 24 // Thời gian tồn tại cookie (ví dụ: 1 ngày)
    }
}));
console.log("Đã khởi tạo session middleware."); // <-- LOG 1

// 4. Middleware để truyền thông tin user vào res.locals cho mọi template EJS
// (Phải đặt SAU session)
app.use((req, res, next) => {
    console.log(`--- Request đến: ${req.method} ${req.originalUrl}`); // <-- LOG 2
    console.log("Middleware res.locals: req.session.user TRƯỚC KHI gán:", req.session.user); // <-- LOG 3
    res.locals.user = req.session.user; // Gán user từ session vào biến locals
    console.log("Middleware res.locals: res.locals.user SAU KHI gán:", res.locals.user); // <-- LOG 4
    next(); // Chuyển sang middleware/route tiếp theo
});
console.log("Đã khởi tạo res.locals middleware."); // <-- LOG 5
// ----------------------------------------

// --- Định nghĩa Routes ---

// Các route GET cơ bản
app.get('/handofhope/trangchu', (req, res) => {
    console.log("\n--- Xử lý GET /handofhope/trangchu ---"); // <-- LOG 15
    console.log("Render trangchu: res.locals.user là:", res.locals.user); // <-- LOG 16
    console.log("Render trangchu: req.session.user là:", req.session.user); // <-- LOG 17
    res.render('trangchu', { pageTitle: 'Trang Chủ - Hands of Hope' });
});
app.get('/handofhope/gioi-thieu', (req, res) => {
    res.render('gioithieu', { pageTitle: 'Giới Thiệu - Hands of Hope' });
});
app.get('/handofhope/hanh-trinh', (req, res) => {
    res.render('hanhtrinh', { pageTitle: 'Hành Trình - Hands of Hope' });
});
app.get('/handofhope/lien-he', (req, res) => {
    res.render('lienhe', { pageTitle: 'Liên Hệ - Hands of Hope' });
});
app.get('/handofhope/quyen-gop', (req, res) => {
    res.render('quyengop', { pageTitle: 'Quyên Góp - Hands of Hope' });
});

// Route GET trang đăng nhập
app.get('/login', (req, res) => {
    // Nếu đã đăng nhập rồi thì chuyển hướng về trang chủ
    if (req.session.user) {
        console.log("User đã đăng nhập, chuyển hướng từ /login về trang chủ.");
        return res.redirect('/handofhope/trangchu');
    }
    console.log("Hiển thị trang đăng nhập.");
    res.render('login', { pageTitle: 'Đăng Nhập - Hands of Hope' }); // error sẽ là undefined nếu không có lỗi
});

// Route GET trang đăng ký
app.get('/register', (req, res) => {
    // Nếu đã đăng nhập rồi thì chuyển hướng về trang chủ
    if (req.session.user) {
        console.log("User đã đăng nhập, chuyển hướng từ /register về trang chủ.");
        return res.redirect('/handofhope/trangchu');
    }
    console.log("Hiển thị trang đăng ký.");
    res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope' }); // error sẽ là undefined nếu không có lỗi
});

// Route GET đăng xuất
app.get('/logout', (req, res, next) => {
    console.log("\n--- Xử lý GET /logout ---");
    req.session.destroy((err) => {
        if (err) {
            console.error("!!! Lỗi khi hủy session:", err);
            return next(err); // Chuyển lỗi cho Express xử lý (nếu có middleware lỗi)
        }
        console.log("Session đã được hủy. Chuyển hướng về /login.");
        res.redirect('/login');
    });
});


// Route POST xử lý đăng ký (Giữ lại phiên bản đầy đủ, xóa bỏ bản trùng lặp)
app.post('/xu-ly-dang-ky', async (req, res, next) => { // Thêm next để có thể gọi next(error)
    const { username, fullname, email, password, confirm_password } = req.body;
    console.log(`\n--- Bắt đầu xử lý POST /xu-ly-dang-ky cho email: ${email}`);

    if (password !== confirm_password) {
        console.log("Đăng ký thất bại: Mật khẩu không khớp.");
        return res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope', error: 'Mật khẩu xác nhận không khớp.' });
    }

    try {
        const existingUserEmail = await User.findOne({ where: { email } });
        if (existingUserEmail) {
            console.log("Đăng ký thất bại: Email đã tồn tại.");
            return res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope', error: 'Email đã được sử dụng.' });
        }

        const existingUsername = await User.findOne({ where: { username } });
        if (existingUsername) {
            console.log("Đăng ký thất bại: Tên đăng nhập đã tồn tại.");
            return res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope', error: 'Tên đăng nhập đã được sử dụng.' });
        }

        console.log("Đang hash mật khẩu...");
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("Hash mật khẩu thành công. Đang tạo user...");

        await User.create({
            username,
            email,
            password_hash: hashedPassword,
            full_name: fullname
        });
        console.log(`Tạo user ${username} thành công. Chuyển hướng về /login.`);
        res.redirect('/login');

    } catch (error) {
        console.error("!!! LỖI trong khối try...catch của /xu-ly-dang-ky:", error);
        // Có thể render lỗi hoặc chuyển cho middleware xử lý lỗi
        res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope', error: 'Đã có lỗi xảy ra trong quá trình đăng ký.' });
        // Hoặc: return next(error);
    }
});


// Route POST xử lý đăng nhập (Đã sửa + thêm log)
app.post('/xu-ly-dang-nhap', async (req, res, next) => { // Thêm next
    const { username, password } = req.body;
    console.log(`\n--- Bắt đầu xử lý POST /xu-ly-dang-nhap cho: ${username}`); // <-- LOG 6

    try {
        const user = await User.findOne({
             where: { [Op.or]: [{ username: username }, { email: username }] }
        });

        if (!user) {
            console.log("Đăng nhập thất bại: Tài khoản không tồn tại."); // <-- LOG 7
            return res.render('login', { pageTitle: 'Đăng Nhập - Hands of Hope', error: 'Tài khoản không tồn tại.' });
        }

        console.log(`Tìm thấy user: ${user.username}. Đang so sánh mật khẩu...`);
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            console.log("Đăng nhập thất bại: Mật khẩu không đúng cho user:", user.username); // <-- LOG 8
            return res.render('login', { pageTitle: 'Đăng Nhập - Hands of Hope', error: 'Mật khẩu không đúng.' });
        }

        // ---- Đăng nhập thành công ----
        console.log(`Đăng nhập thành công cho user: ${user.username}`); // <-- LOG 9
        const userDataToSave = { // Tạo biến riêng để dễ log
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            avatar_url: user.avatar_url
            // Tuyệt đối không lưu password_hash
        };
        req.session.user = userDataToSave;
        console.log("Đã gán vào req.session.user:", req.session.user); // <-- LOG 10

        console.log("Chuẩn bị gọi req.session.save()..."); // <-- LOG 11
        req.session.save(err => {
            if (err) {
                console.error("!!! LỖI khi gọi req.session.save():", err); // <-- LOG 12 (LỖI)
                return next(err); // Chuyển lỗi cho Express
            }
            console.log(">>> req.session.save() thành công. Đang chuyển hướng về /handofhope/trangchu..."); // <-- LOG 13 (THÀNH CÔNG)
            res.redirect('/handofhope/trangchu');
        });
        // -----------------------------

    } catch (error) {
        console.error("!!! LỖI trong khối try...catch của /xu-ly-dang-nhap:", error); // <-- LOG 14 (LỖI)
        res.render('login', { pageTitle: 'Đăng Nhập - Hands of Hope', error: 'Đã có lỗi xảy ra, vui lòng thử lại.' });
         // Hoặc: return next(error);
    }
});

// --- Kết nối Database và Khởi động Server ---
sequelize.authenticate()
    .then(() => {
        console.log('Kết nối Sequelize thành công!');
        // sequelize.sync() sẽ tạo bảng nếu chưa có dựa trên model đã định nghĩa
        // { alter: true } sẽ cố gắng cập nhật bảng để khớp với model (cẩn thận khi dùng với dữ liệu thật)
        // { force: true } sẽ xóa bảng cũ và tạo lại (mất hết dữ liệu) - chỉ dùng trong dev
        return sequelize.sync(); // Chạy sync sau khi kết nối thành công
    })
    .then(() => {
        console.log('Đã đồng bộ model với database.');
        // Khởi động server chỉ sau khi kết nối và sync DB thành công
        const port = process.env.PORT || 3000; // Nên dùng biến môi trường PORT
        app.listen(port, () => {
            console.log(`Máy chủ đang chạy tại http://localhost:${port}`);
            console.log(`Truy cập trang chủ tại http://localhost:${port}/handofhope/trangchu`);
        });
    })
    .catch(err => {
        // Bắt lỗi ở cả quá trình authenticate và sync
        console.error('Lỗi khởi động ứng dụng (Sequelize):', err);
        process.exit(1); // Thoát ứng dụng nếu không kết nối được DB
    });

// --- (Tùy chọn) Middleware xử lý lỗi 404 (Không tìm thấy route) ---
// Đặt sau tất cả các route khác
// app.use((req, res, next) => {
//   res.status(404).render('404', { pageTitle: 'Không tìm thấy trang' }); // Tạo file views/404.ejs
// });

// --- (Tùy chọn) Middleware xử lý lỗi chung (vd: lỗi từ next(err)) ---
// Phải có 4 tham số (err, req, res, next)
// Đặt ở cuối cùng
// app.use((err, req, res, next) => {
//   console.error("LỖI SERVER:", err.stack);
//   res.status(err.status || 500);
//   res.render('error', { // Tạo file views/error.ejs
//     pageTitle: 'Lỗi Server',
//     message: err.message,
//     // Chỉ hiển thị stack trace ở môi trường dev
//     error: process.env.NODE_ENV === 'development' ? err : {}
//   });
// });