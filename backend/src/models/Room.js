const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const songSchema = new mongoose.Schema({
    id: { type: String, default: () => uuidv4() },
    youtubeId: { type: String, required: true },
    title: { type: String, required: true },
    thumbnail: { type: String },
    duration: { type: String },
    addedBy: { _id: String, name: String, avatar: String },
    likes: [{ type: String }], // array of user IDs
}, { _id: false });

const activitySchema = new mongoose.Schema({
    type: { type: String },
    message: { type: String },
    user: { _id: String, name: String },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });

const roomSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    controlledBy: { type: String, default: null }, // user id who has control (if not admin)
    playlist: [songSchema],
    currentSongIndex: { type: Number, default: 0 },
    playbackState: {
        isPlaying: { type: Boolean, default: false },
        currentTime: { type: Number, default: 0 },
        updatedAt: { type: Date, default: Date.now },
    },
    users: [{
        _id: String,
        name: String,
        avatar: String,
        socketId: String,
        isMuted: { type: Boolean, default: false },
    }],
    bannedUsers: [{ type: String }],
    activityLog: [activitySchema],
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
