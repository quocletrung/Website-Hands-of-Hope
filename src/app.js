// Trong file D:\CharityWeb\src\app.js

const express = require('express');
const path = require('path');
const app = express();

// ... các phần khác của mã ...

// Cấu hình view engine và thư mục views
app.set('view engine', 'ejs');
// SỬA LẠI DÒNG NÀY:
// Bỏ 'src/' vì __dirname đã trỏ tới D:\CharityWeb\src rồi
app.set('views', path.join(__dirname, 'views'));


app.use(express.static(path.join(__dirname, '../public')));


app.get('/handofhope/trangchu', (req, res) => {
    res.render('trangchu',{ pageTitle: 'Trang Chủ - Hands of Hope' }); // Express sẽ tìm trangchu.ejs trong D:\CharityWeb\src\views
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


app.get('/login', (req, res) => {
    // Giả sử tệp login.ejs của bạn nằm trong thư mục views đã được cấu hình
    // Ví dụ: src/views/login.ejs
    res.render('login', { pageTitle: 'Đăng Nhập - Hands of Hope' }); // Truyền dữ liệu nếu cần
});
app.get('/register', (req, res) => {

    res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope' }); // Truyền dữ liệu nếu cần
});

// ...existing code...
const sequelize = require('./config/database');
sequelize.authenticate()
    .then(() => {
        console.log('Kết nối Sequelize thành công!');
        // Tạo bảng nếu chưa có
        return sequelize.sync();
    })
    .then(() => {
        console.log('Đã đồng bộ model với database.');
    })
    .catch(err => {
        console.error('Lỗi kết nối Sequelize:', err);
    });
// ...existing code...

const port = 3000; // Hoặc cổng của bạn
app.listen(port, () => {
    console.log(`Máy chủ đang chạy tại http://localhost:${port}`);
    console.log(`Truy cập trang chủ tại http://localhost:${port}/handofhope/trangchu`);

});

const bcrypt = require('bcryptjs');
const User = require('./models/User');

app.use(express.urlencoded({ extended: true })); // Để đọc dữ liệu từ form

app.post('/xu-ly-dang-ky', async (req, res) => {
    const { username, email, password, confirm_password, fullname } = req.body;

    // Kiểm tra xác nhận mật khẩu
    if (password !== confirm_password) {
        return res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope', error: 'Mật khẩu xác nhận không khớp.' });
    }

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
        return res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope', error: 'Email đã được sử dụng.' });
    }

    // Hash mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user mới
    await User.create({
    username, // hoặc lấy từ req.body.username nếu có
    email,
    password_hash: hashedPassword, // Đúng tên trường trong model
    full_name: fullname // hoặc req.body.fullname nếu form có trường này
});

    // Chuyển hướng sang trang đăng nhập hoặc trang chủ
    res.redirect('/login');
});

// const bcrypt = require('bcryptjs');
// const User = require('./models/User');

app.use(express.urlencoded({ extended: true }));

app.post('/xu-ly-dang-ky', async (req, res) => {
    const { username, fullname, email, password, confirm_password } = req.body; // Thêm username

    // Kiểm tra xác nhận mật khẩu
    if (password !== confirm_password) {
        return res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope', error: 'Mật khẩu xác nhận không khớp.' });
    }

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
        return res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope', error: 'Email đã được sử dụng.' });
    }

    // Kiểm tra username đã tồn tại chưa
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
        return res.render('register', { pageTitle: 'Đăng Kí - Hands of Hope', error: 'Tên đăng nhập đã được sử dụng.' });
    }

    // Hash mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user mới
    await User.create({
        username,
        email,
        password_hash: hashedPassword,
        full_name: fullname
    });

    // Chuyển hướng sang trang đăng nhập
    res.redirect('/login');
});

const { Op } = require('sequelize');

app.post('/xu-ly-dang-nhap', async (req, res) => {
    const { username, password } = req.body;

    // Tìm user theo username hoặc email
    const user = await User.findOne({
        where: {
            [Op.or]: [
                { username: username },
                { email: username }
            ]
        }
    });

    if (!user) {
        return res.render('login', { pageTitle: 'Đăng Nhập - Hands of Hope', error: 'Tài khoản không tồn tại.' });
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        return res.render('login', { pageTitle: 'Đăng Nhập - Hands of Hope', error: 'Mật khẩu không đúng.' });
    }

    // Đăng nhập thành công (có thể lưu session tại đây)
    // req.session.userId = user.id; // Nếu dùng express-session

    // Chuyển hướng về trang chủ hoặc dashboard
    res.redirect('/handofhope/trangchu');
});
// ...existing code...
