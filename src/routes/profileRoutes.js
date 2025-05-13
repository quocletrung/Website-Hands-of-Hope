const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Điều chỉnh đường dẫn nếu model User của bạn ở nơi khác
const multer = require('multer');
const cloudinary = require('../config/cloudinary.config.js'); // Điều chỉnh đường dẫn đến file config Cloudinary của bạn
const fs = require('fs');
// const path = require('path'); // Hiện tại không dùng trực tiếp path ở đây

// Middleware đảm bảo người dùng đã xác thực
function ensureAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    // Nếu dùng connect-flash, bạn có thể thêm flash message
    // req.flash('error_msg', 'Vui lòng đăng nhập để xem trang này.');
    res.redirect('/login'); // Hoặc route đăng nhập của bạn
}

// --- Cấu hình Multer cho việc Upload Avatar ---
const uploadDir = 'uploads/'; // Đảm bảo thư mục này tồn tại hoặc được tạo
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ được phép tải lên file ảnh!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 2 // Giới hạn 2MB
    },
    fileFilter: fileFilter
});
// --- Kết thúc Cấu hình Multer ---


// GET /profile - Hiển thị trang hồ sơ người dùng
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        // Để đảm bảo dữ liệu LUÔN mới nhất khi vào trang profile,
        // chúng ta sẽ lấy lại thông tin từ DB và cập nhật session/locals.
        const userId = req.session.user.id;
        const userFromDb = await User.findByPk(userId);

        if (!userFromDb) {
            console.warn(`GET /profile: User ID ${userId} không tìm thấy trong DB. Hủy session.`);
            req.session.destroy();
            return res.redirect('/login?error_msg=User not found or session expired.');
        }

        const plainUserFromDb = userFromDb.get({ plain: true });

        // Cập nhật session và res.locals với dữ liệu mới nhất
        req.session.user = plainUserFromDb;
        res.locals.user = plainUserFromDb; // Đảm bảo res.locals cũng được cập nhật cho lần render này

        console.log('GET /profile - Dữ liệu user được làm mới từ DB:', JSON.stringify(res.locals.user, null, 2));

        const success_msg = req.query.success_msg;
        const error_msg = req.query.error_msg;

        res.render('profile', {
            pageTitle: `${res.locals.user.full_name || res.locals.user.username} - Hồ sơ`,
            success_msg: success_msg,
            error_msg: error_msg
        });
    } catch (error) {
        console.error("Lỗi khi tải trang profile và làm mới dữ liệu:", error);
        // Nếu có lỗi, thử render với dữ liệu cũ trong session (nếu có)
        if (req.session.user && res.locals.user) { // Kiểm tra cả req.session.user để an toàn hơn
             console.warn("GET /profile: Không thể làm mới dữ liệu từ DB, sử dụng dữ liệu cũ trong session.");
             res.render('profile', {
                pageTitle: `${res.locals.user.full_name || res.locals.user.username} - Hồ sơ`,
                error_msg: "Không thể tải dữ liệu mới nhất, một số thông tin có thể đã cũ."
            });
        } else {
            // Nếu không có cả session, có thể là lỗi nghiêm trọng hoặc user chưa đăng nhập
            console.error("GET /profile: Không có user trong session để fallback.");
            res.status(500).send("Lỗi máy chủ khi tải trang hồ sơ hoặc phiên đăng nhập không hợp lệ.");
        }
    }
});

// POST /profile/update-avatar - Xử lý cập nhật ảnh đại diện
router.post('/update-avatar', ensureAuthenticated, upload.single('avatar'), async (req, res, next) => {
    if (!req.file) {
        return res.redirect('/profile?error_msg=' + encodeURIComponent('Vui lòng chọn một file ảnh.'));
    }

    try {
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "charity_web_avatars",
            transformation: [
                { width: 200, height: 200, crop: "fill", gravity: "face" },
                { quality: "auto" }
            ]
        });

        const newAvatarUrl = result.secure_url;
        const userToUpdate = await User.findByPk(req.session.user.id);

        if (userToUpdate) {
            userToUpdate.avatar_url = newAvatarUrl;
            await userToUpdate.save(); // Lưu thay đổi vào DB

            // Lấy lại thông tin user mới nhất từ DB để cập nhật session
            const updatedUserFromDb = await User.findByPk(req.session.user.id);
            if (updatedUserFromDb) {
                req.session.user = updatedUserFromDb.get({ plain: true }); // Cập nhật toàn bộ user trong session
                console.log('UPDATE AVATAR - Session được cập nhật với dữ liệu mới từ DB:', req.session.user);
            } else {
                // Hiếm khi xảy ra, nhưng nên log lại
                console.error('UPDATE AVATAR - Không tìm thấy user trong DB sau khi cập nhật avatar để làm mới session.');
                // Trong trường hợp này, session vẫn còn userToUpdate (chưa có updated_at mới nhất)
                // nhưng ít nhất avatar_url đã được cập nhật ở dòng trên.
                // Tuy nhiên, việc lấy lại từ DB ở trên là an toàn nhất.
            }

            req.session.save(err => {
                if (err) {
                    console.error("Lỗi lưu session sau khi cập nhật avatar:", err);
                    fs.unlinkSync(req.file.path);
                    return next(err);
                }
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error("Lỗi xóa file tạm sau khi cập nhật avatar thành công:", unlinkErr);
                });
                res.redirect('/profile?success_msg=' + encodeURIComponent('Cập nhật ảnh đại diện thành công!'));
            });
        } else {
            fs.unlinkSync(req.file.path);
            res.redirect('/profile?error_msg=' + encodeURIComponent('Không tìm thấy người dùng.'));
        }
    } catch (error) {
        console.error("Lỗi khi upload ảnh đại diện:", error);
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error("Lỗi xóa file tạm (sau lỗi upload ảnh đại diện):", unlinkErr);
            });
        }
        let errorMessage = 'Có lỗi xảy ra khi cập nhật ảnh đại diện.';
        if (error.message && error.message.includes('File size too large')) {
            errorMessage = 'Kích thước file quá lớn, vui lòng chọn file nhỏ hơn 2MB.';
        } else if (error.message && error.message.includes('Chỉ được phép tải lên file ảnh!')) {
            errorMessage = 'Định dạng file không hợp lệ. Vui lòng chọn file ảnh.';
        }
        res.redirect('/profile?error_msg=' + encodeURIComponent(errorMessage));
    }
});

// POST /profile/update-info - Xử lý cập nhật thông tin hồ sơ
router.post('/update-info', ensureAuthenticated, async (req, res) => {
    const { full_name, bio, location } = req.body;
    console.log('UPDATE INFO - Dữ liệu nhận từ form:', req.body);
    try {
        const userToUpdate = await User.findByPk(req.session.user.id);
        if (userToUpdate) {
            userToUpdate.full_name = full_name === undefined ? userToUpdate.full_name : full_name;
            userToUpdate.bio = bio === undefined ? userToUpdate.bio : bio;
            userToUpdate.location = location === undefined ? userToUpdate.location : location;
            // Thêm các trường khác nếu có, ví dụ:
            // userToUpdate.volunpoints = req.body.volunpoints === undefined ? userToUpdate.volunpoints : req.body.volunpoints;

            await userToUpdate.save(); // Lưu thay đổi vào DB
            console.log('UPDATE INFO - User sau khi lưu vào DB:', userToUpdate.toJSON());

            // Lấy lại thông tin user mới nhất từ DB để cập nhật session
            const updatedUserFromDb = await User.findByPk(req.session.user.id);
            if (updatedUserFromDb) {
                req.session.user = updatedUserFromDb.get({ plain: true }); // Cập nhật toàn bộ user trong session
                console.log('UPDATE INFO - Session được cập nhật với dữ liệu mới từ DB:', req.session.user);
            } else {
                console.error('UPDATE INFO - Không tìm thấy user trong DB sau khi cập nhật thông tin để làm mới session.');
            }

            req.session.save(err => {
                if (err) {
                    console.error("Lỗi lưu session sau khi cập nhật thông tin:", err);
                    return res.redirect('/profile?error_msg=' + encodeURIComponent('Lỗi khi lưu session.'));
                }
                console.log('UPDATE INFO - Session ĐÃ ĐƯỢC LƯU sau khi cập nhật thông tin.');
                res.redirect('/profile?success_msg=' + encodeURIComponent('Cập nhật thông tin thành công!'));
            });
        } else {
            res.redirect('/profile?error_msg=' + encodeURIComponent('Không tìm thấy người dùng.'));
        }
    } catch (error) {
        console.error("Lỗi cập nhật thông tin profile:", error);
        res.redirect('/profile?error_msg=' + encodeURIComponent('Có lỗi xảy ra khi cập nhật thông tin.'));
    }
});

// POST /profile/change-password - Xử lý thay đổi mật khẩu
router.post('/change-password', ensureAuthenticated, async (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const bcrypt = require('bcryptjs'); // Đảm bảo bcryptjs có sẵn

    if (newPassword !== confirmNewPassword) {
        return res.redirect('/profile?error_msg=' + encodeURIComponent('Mật khẩu mới không khớp.'));
    }
    if (!newPassword || newPassword.length < 6) { // Ví dụ: mật khẩu tối thiểu 6 ký tự
        return res.redirect('/profile?error_msg=' + encodeURIComponent('Mật khẩu mới phải có ít nhất 6 ký tự.'));
    }

    try {
        const userToUpdate = await User.findByPk(req.session.user.id);
        if (userToUpdate) {
            const isMatch = await bcrypt.compare(currentPassword, userToUpdate.password_hash);
            if (!isMatch) {
                return res.redirect('/profile?error_msg=' + encodeURIComponent('Mật khẩu hiện tại không đúng.'));
            }

            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            userToUpdate.password_hash = hashedNewPassword;
            // Khi đổi mật khẩu, updated_at cũng sẽ được cập nhật trong DB
            await userToUpdate.save();

            // Sau khi đổi mật khẩu, bạn có thể muốn:
            // 1. Cập nhật session với `updated_at` mới (nếu hiển thị)
            // 2. Bắt buộc người dùng đăng nhập lại vì lý do bảo mật (phổ biến)
            // 3. Hoặc chỉ hiển thị thông báo thành công.

            // Tùy chọn: Cập nhật updated_at trong session nếu cần
            /*
            const updatedUserFromDb = await User.findByPk(req.session.user.id);
            if (updatedUserFromDb) {
                req.session.user.updated_at = updatedUserFromDb.updated_at; // Chỉ cập nhật updated_at
                 // Hoặc cập nhật toàn bộ: req.session.user = updatedUserFromDb.get({ plain: true });
                 // nhưng nếu làm vậy thì không cần đăng xuất.
            }
            */

            // Để đơn giản, chỉ hiển thị thông báo và giữ phiên đăng nhập
            // Nếu muốn bảo mật hơn, hãy hủy session và yêu cầu đăng nhập lại:
            /*
            req.session.destroy(err => {
                if (err) {
                    console.error("Lỗi hủy session sau khi đổi mật khẩu:", err);
                    return res.redirect('/profile?error_msg=Lỗi hệ thống, vui lòng thử lại.');
                }
                res.redirect('/login?success_msg=Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
            });
            */
            // Hiện tại, chúng ta chỉ redirect với thông báo thành công và giữ session
             req.session.save(err => { // Gọi save để đảm bảo session (nếu có thay đổi nhỏ) được lưu
                if(err) {
                    console.error("Lỗi lưu session nhỏ sau khi đổi mật khẩu:", err);
                }
                res.redirect('/profile?success_msg=' + encodeURIComponent('Đổi mật khẩu thành công!'));
            });

        } else {
            res.redirect('/profile?error_msg=' + encodeURIComponent('Không tìm thấy người dùng.'));
        }
    } catch (error) {
        console.error("Lỗi đổi mật khẩu:", error);
        res.redirect('/profile?error_msg=' + encodeURIComponent('Có lỗi xảy ra khi đổi mật khẩu.'));
    }
});

module.exports = router;