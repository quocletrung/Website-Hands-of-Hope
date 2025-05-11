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



const port = 3000; // Hoặc cổng của bạn
app.listen(port, () => {
    console.log(`Máy chủ đang chạy tại http://localhost:${port}`);
    console.log(`Truy cập trang chủ tại http://localhost:${port}/handofhope/trangchu`);

});