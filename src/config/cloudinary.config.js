// src/config/cloudinary.config.js
const cloudinary = require('cloudinary').v2;
require('dotenv').config(); // Để đọc biến từ .env

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true // Nên dùng https
});

module.exports = cloudinary;