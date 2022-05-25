const mongoose = require('mongoose');
const bcrypt = require ('bcryptjs');
const config = require ('../config/database');

// User Schema
const UserSchema = mongoose.Schema({
    firstname: { required: true, type: String },
	lastname: { required: true, type: String },
	email: { required: true, unique: true, type: String },
	password: { required: true, type: String },
	isAdmin: { default: false, type: Boolean },
    status: {type: String, enum: ['Pending', 'Active'],default: 'Pending'},
    confirmationCode: { type: String, unique: true }
});

const User = module.exports = mongoose.model('User', UserSchema);

module.exports.getUserById = (id,  callback) => {
    User.findById(id, callback);
};

module.exports.getUserByEmail = (email,  callback) => {
    const query = {email: email};
    User.findOne(query, callback);
};

module.exports.addUser = (newUser, callback) => {
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            newUser.save(callback);
        });
    });
};

module.exports.comparePassword = (candidatePassword, hash, callback) => {
    bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
        if (err) throw err;
        callback(null, isMatch);
    });
};