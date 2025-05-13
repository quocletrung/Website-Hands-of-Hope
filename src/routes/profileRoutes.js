const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Adjust path if your User model is elsewhere
const multer = require('multer');
const cloudinary = require('../config/cloudinary.config.js'); // Adjust path to your Cloudinary config
const fs = require('fs');
const path = require('path'); // Needed for path.join if you use it directly here

// Middleware to ensure user is authenticated (you might already have this in app.js or a separate middleware file)
function ensureAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    // If using connect-flash, you can add a flash message
    // req.flash('error_msg', 'Vui lòng đăng nhập để xem trang này.');
    res.redirect('/login'); // Or your login route
}

// --- Multer Configuration for Avatar Upload ---
const uploadDir = 'uploads/'; // Make sure this directory exists or is created
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
        fileSize: 1024 * 1024 * 2 // 2MB limit
    },
    fileFilter: fileFilter
});
// --- End Multer Configuration ---


// GET /profile - Display user profile page
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        // User data is available from session via res.locals.user (set by your middleware in app.js)
        // or directly req.session.user
        // If you need the freshest data, uncomment and use:
        // const userFromDb = await User.findByPk(req.session.user.id);
        // if (!userFromDb) {
        //     req.session.destroy();
        //     return res.redirect('/login');
        // }
        // res.locals.user = userFromDb; // This might be redundant if app.js middleware already does this

        const success_msg = req.query.success_msg;
        const error_msg = req.query.error_msg;

        res.render('profile', { // Assumes 'profile.ejs' is in your views directory
            pageTitle: `${res.locals.user.full_name || res.locals.user.username} - Hồ sơ`,
            // 'user' will be available in profile.ejs through res.locals setup in app.js
            success_msg: success_msg,
            error_msg: error_msg
        });
    } catch (error) {
        console.error("Lỗi khi tải trang profile:", error);
        res.status(500).send("Lỗi máy chủ khi tải trang hồ sơ.");
    }
});

// POST /profile/update-avatar - Handle avatar update
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
            await userToUpdate.save();

            req.session.user.avatar_url = newAvatarUrl; // Update session
            req.session.save(err => {
                if (err) {
                    console.error("Lỗi lưu session sau khi cập nhật avatar:", err);
                    fs.unlinkSync(req.file.path); // Clean up temp file on error too
                    return next(err);
                }
                fs.unlink(req.file.path, (unlinkErr) => { // Clean up temp file
                    if (unlinkErr) console.error("Lỗi xóa file tạm:", unlinkErr);
                });
                res.redirect('/profile?success_msg=' + encodeURIComponent('Cập nhật ảnh đại diện thành công!'));
            });
        } else {
            fs.unlinkSync(req.file.path); // Clean up temp file
            res.redirect('/profile?error_msg=' + encodeURIComponent('Không tìm thấy người dùng.'));
        }
    } catch (error) {
        console.error("Lỗi khi upload ảnh đại diện:", error);
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error("Lỗi xóa file tạm (sau lỗi upload):", unlinkErr);
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

// POST /profile/update-info - Handle profile information update
router.post('/update-info', ensureAuthenticated, async (req, res) => {
    const { full_name, bio, location } = req.body;
    try {
        const userToUpdate = await User.findByPk(req.session.user.id);
        if (userToUpdate) {
            userToUpdate.full_name = full_name || userToUpdate.full_name;
            userToUpdate.bio = bio; // Allow empty bio
            userToUpdate.location = location; // Allow empty location
            await userToUpdate.save();

            // Update session
            req.session.user.full_name = userToUpdate.full_name;
            // You might want to update bio and location in session too if used elsewhere
            req.session.save(err => {
                if (err) {
                    console.error("Lỗi lưu session sau khi cập nhật thông tin:", err);
                    return res.redirect('/profile?error_msg=' + encodeURIComponent('Lỗi khi lưu session.'));
                }
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

// POST /profile/change-password - Handle password change
router.post('/change-password', ensureAuthenticated, async (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const bcrypt = require('bcryptjs'); // Make sure bcryptjs is available

    if (newPassword !== confirmNewPassword) {
        return res.redirect('/profile?error_msg=' + encodeURIComponent('Mật khẩu mới không khớp.'));
    }
    if (!newPassword || newPassword.length < 6) { // Example: minimum password length
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
            await userToUpdate.save();

            // Optionally, you might want to log the user out or just show a success message.
            // For security, ending other sessions or notifying the user might be a good idea.
            res.redirect('/profile?success_msg=' + encodeURIComponent('Đổi mật khẩu thành công!'));
        } else {
            res.redirect('/profile?error_msg=' + encodeURIComponent('Không tìm thấy người dùng.'));
        }
    } catch (error) {
        console.error("Lỗi đổi mật khẩu:", error);
        res.redirect('/profile?error_msg=' + encodeURIComponent('Có lỗi xảy ra khi đổi mật khẩu.'));
    }
});

// Ví dụ trong file src/routes/profileRoutes.js
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        console.log('Kiểm tra user trong session tại GET /profile:', req.session.user);
        if (req.session.user) {
            console.log('Kiểm tra user.bio trong session:', req.session.user.bio);
        }

        const success_msg = req.query.success_msg;
        const error_msg = req.query.error_msg;

        res.render('profile', {
            pageTitle: `${res.locals.user.full_name || res.locals.user.username} - Hồ sơ`,
            // user đã có sẵn trong res.locals.user (được gán từ req.session.user)
            success_msg: success_msg,
            error_msg: error_msg
        });
    } catch (error) {
        console.error("Lỗi khi tải trang profile:", error);
        res.status(500).send("Lỗi máy chủ khi tải trang hồ sơ.");
    }
});
router.post('/update-info', ensureAuthenticated, async (req, res) => {
    const { full_name, bio, location } = req.body; // Lấy bio từ form
    console.log('Dữ liệu nhận được từ form update-info:', req.body); // Kiểm tra bio có được gửi lên không

    try {
        const userToUpdate = await User.findByPk(req.session.user.id);
        if (userToUpdate) {
            userToUpdate.full_name = full_name || userToUpdate.full_name;
            userToUpdate.bio = bio; // Gán giá trị bio mới
            userToUpdate.location = location;
            await userToUpdate.save(); // Lưu vào database

            console.log('User sau khi cập nhật DB:', userToUpdate.toJSON());

            // !!! QUAN TRỌNG: Cập nhật lại thông tin bio trong session !!!
            req.session.user.full_name = userToUpdate.full_name;
            req.session.user.bio = userToUpdate.bio; // Đảm bảo dòng này có và đúng
            req.session.user.location = userToUpdate.location; // Cập nhật các trường khác nếu cần

            req.session.save(err => {
                if (err) {
                    console.error("Lỗi lưu session sau khi cập nhật thông tin:", err);
                    return res.redirect('/profile?error_msg=' + encodeURIComponent('Lỗi khi lưu session.'));
                }
                console.log('Session sau khi cập nhật bio:', req.session.user);
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
module.exports = router;