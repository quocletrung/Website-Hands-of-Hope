const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// ...existing code...
const VolunteerPost = sequelize.define('VolunteerPost', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    image_url: { type: DataTypes.STRING(255), allowNull: true },
    location: { type: DataTypes.STRING(255), allowNull: true },
    event_date: { type: DataTypes.DATE, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: false }, // user id
    status: { // Thêm trường status
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending'
    }
}, {
    tableName: 'volunteer_posts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});
// ...existing code...

module.exports = VolunteerPost;