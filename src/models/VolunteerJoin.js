const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VolunteerJoin = sequelize.define('VolunteerJoin', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    post_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
    tableName: 'volunteer_joins',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = VolunteerJoin;