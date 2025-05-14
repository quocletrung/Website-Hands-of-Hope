const User = require('./User');
const VolunteerPost = require('./VolunteerPost');

VolunteerPost.belongsTo(User, { foreignKey: 'created_by', as: 'author' });
User.hasMany(VolunteerPost, { foreignKey: 'created_by', as: 'posts' });

module.exports = { User, VolunteerPost };