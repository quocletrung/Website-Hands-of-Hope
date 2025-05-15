const User = require('./User');
const VolunteerPost = require('./VolunteerPost');
const VolunteerJoin = require('./VolunteerJoin');

VolunteerPost.belongsTo(User, { foreignKey: 'created_by', as: 'author' });
User.hasMany(VolunteerPost, { foreignKey: 'created_by', as: 'posts' });

User.hasMany(VolunteerJoin, { foreignKey: 'user_id' });
VolunteerJoin.belongsTo(User, { foreignKey: 'user_id' });

VolunteerPost.hasMany(VolunteerJoin, { foreignKey: 'post_id' });
VolunteerJoin.belongsTo(VolunteerPost, { foreignKey: 'post_id' });

module.exports = { User, VolunteerPost, VolunteerJoin };