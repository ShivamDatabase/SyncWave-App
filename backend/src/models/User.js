const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String },
    avatar: { type: String, default: '' },
    googleId: { type: String },
    role: { type: String, enum: ['admin', 'moderator', 'user'], default: 'user' },
    isBanned: { type: Boolean, default: false },
}, { timestamps: true });

userSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) return;
    this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublic = function () {
    return { _id: this._id, name: this.name, email: this.email, avatar: this.avatar, role: this.role, isBanned: this.isBanned };
};

module.exports = mongoose.model('User', userSchema);
