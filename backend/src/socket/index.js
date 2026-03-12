const Room = require('../models/Room');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

// Verify JWT from socket handshake
async function authenticateSocket(socket, next) {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) return next(new Error('User not found'));
        socket.user = user;
        next();
    } catch {
        next(new Error('Invalid token'));
    }
}

function canControl(room, userId) {
    const adminId = room.admin._id ? room.admin._id.toString() : room.admin.toString();
    return adminId === userId || room.controlledBy === userId;
}

async function addActivity(room, type, message, userInfo) {
    room.activityLog.unshift({ type, message, user: userInfo, createdAt: new Date() });
    if (room.activityLog.length > 50) room.activityLog = room.activityLog.slice(0, 50);
}

module.exports = (io) => {
    io.use(authenticateSocket);

    io.on('connection', (socket) => {
        const userId = socket.user._id.toString();
        const userInfo = { _id: userId, name: socket.user.name, avatar: socket.user.avatar };

        // ── JOIN ROOM ──────────────────────────────────────────────────────────────
        socket.on('join-room', async ({ roomCode }) => {
            try {
                const room = await Room.findOne({ code: roomCode.toUpperCase() });
                if (!room) return socket.emit('error', { message: 'Room not found' });

                socket.join(roomCode);

                // Add or update user in room
                const existingIdx = room.users.findIndex((u) => u._id === userId);
                if (existingIdx >= 0) {
                    room.users[existingIdx].socketId = socket.id;
                } else {
                    room.users.push({ ...userInfo, socketId: socket.id, isMuted: false });
                    await addActivity(room, 'join', `${socket.user.name} joined the room`, userInfo);
                }

                await room.save();

                // Send room state to the joining user
                socket.emit('room-state', { room });

                // Tell everyone else about the updated users list
                io.to(roomCode).emit('users-updated', { users: room.users });
                io.to(roomCode).emit('activity-log', { log: room.activityLog });

                socket.roomCode = roomCode;
            } catch (err) {
                socket.emit('error', { message: err.message });
            }
        });

        // ── PLAYBACK EVENTS ────────────────────────────────────────────────────────
        socket.on('playback:play', async ({ roomCode, currentTime }) => {
            try {
                const room = await Room.findOne({ code: roomCode });
                if (!room || !canControl(room, userId)) return;

                room.playbackState = { isPlaying: true, currentTime, updatedAt: new Date() };
                await room.save();

                io.to(roomCode).emit('playback:state', room.playbackState);
            } catch (err) {
                socket.emit('error', { message: err.message });
            }
        });

        socket.on('playback:pause', async ({ roomCode, currentTime }) => {
            try {
                const room = await Room.findOne({ code: roomCode });
                if (!room || !canControl(room, userId)) return;

                room.playbackState = { isPlaying: false, currentTime, updatedAt: new Date() };
                await room.save();

                io.to(roomCode).emit('playback:state', room.playbackState);
            } catch (err) {
                socket.emit('error', { message: err.message });
            }
        });

        socket.on('playback:seek', async ({ roomCode, currentTime }) => {
            try {
                const room = await Room.findOne({ code: roomCode });
                if (!room || !canControl(room, userId)) return;

                room.playbackState.currentTime = currentTime;
                room.playbackState.updatedAt = new Date();
                await room.save();

                io.to(roomCode).emit('playback:seek', { currentTime });
            } catch (err) {
                socket.emit('error', { message: err.message });
            }
        });

        socket.on('playback:skip', async ({ roomCode, direction }) => {
            try {
                const room = await Room.findOne({ code: roomCode });
                if (!room || !canControl(room, userId)) return;
                if (room.playlist.length === 0) return;

                const dir = direction === 'prev' ? -1 : 1;
                room.currentSongIndex = Math.max(0, Math.min(room.playlist.length - 1, room.currentSongIndex + dir));
                room.playbackState = { isPlaying: true, currentTime: 0, updatedAt: new Date() };
                await room.save();

                io.to(roomCode).emit('playlist:song-changed', {
                    currentSongIndex: room.currentSongIndex,
                    playbackState: room.playbackState,
                });
                await addActivity(room, 'skip', `${socket.user.name} skipped to next song`, userInfo);
                io.to(roomCode).emit('activity-log', { log: room.activityLog });
                await room.save();
            } catch (err) {
                socket.emit('error', { message: err.message });
            }
        });

        socket.on('playback:song-ended', async ({ roomCode }) => {
            try {
                const room = await Room.findOne({ code: roomCode });
                if (!room || !canControl(room, userId)) return;
                if (room.playlist.length === 0) return;

                if (room.currentSongIndex < room.playlist.length - 1) {
                    room.currentSongIndex += 1;
                    room.playbackState = { isPlaying: true, currentTime: 0, updatedAt: new Date() };
                    await room.save();
                    io.to(roomCode).emit('playlist:song-changed', {
                        currentSongIndex: room.currentSongIndex,
                        playbackState: room.playbackState,
                    });
                } else {
                    room.playbackState = { isPlaying: false, currentTime: 0, updatedAt: new Date() };
                    await room.save();
                    io.to(roomCode).emit('playback:state', room.playbackState);
                }
            } catch (err) {
                socket.emit('error', { message: err.message });
            }
        });

        // ── PLAYLIST EVENTS ────────────────────────────────────────────────────────
        socket.on('playlist:add', async ({ roomCode, song }) => {
            try {
                const room = await Room.findOne({ code: roomCode });
                if (!room) return;

                const newSong = {
                    id: uuidv4(),
                    youtubeId: song.youtubeId,
                    title: song.title,
                    thumbnail: song.thumbnail || '',
                    duration: song.duration || '',
                    addedBy: userInfo,
                    likes: [],
                };

                room.playlist.push(newSong);
                await addActivity(room, 'add', `${socket.user.name} added "${song.title}"`, userInfo);
                await room.save();

                io.to(roomCode).emit('playlist:updated', { playlist: room.playlist });
                io.to(roomCode).emit('activity-log', { log: room.activityLog });
            } catch (err) {
                socket.emit('error', { message: err.message });
            }
        });

        socket.on('playlist:remove', async ({ roomCode, songId }) => {
            try {
                const room = await Room.findOne({ code: roomCode });
                if (!room || !canControl(room, userId)) return;

                const songTitle = room.playlist.find((s) => s.id === songId)?.title;
                room.playlist = room.playlist.filter((s) => s.id !== songId);

                // Adjust current index
                if (room.currentSongIndex >= room.playlist.length) {
                    room.currentSongIndex = Math.max(0, room.playlist.length - 1);
                }

                await addActivity(room, 'remove', `${socket.user.name} removed "${songTitle}"`, userInfo);
                await room.save();

                io.to(roomCode).emit('playlist:updated', { playlist: room.playlist });
                io.to(roomCode).emit('activity-log', { log: room.activityLog });
            } catch (err) {
                socket.emit('error', { message: err.message });
            }
        });

        socket.on('playlist:reorder', async ({ roomCode, fromIndex, toIndex }) => {
            try {
                const room = await Room.findOne({ code: roomCode });
                if (!room || !canControl(room, userId)) return;

                const [moved] = room.playlist.splice(fromIndex, 1);
                room.playlist.splice(toIndex, 0, moved);

                // Adjust current song index
                const currentId = room.playlist[room.currentSongIndex]?.id;
                if (currentId) room.currentSongIndex = room.playlist.findIndex((s) => s.id === currentId);

                await room.save();
                io.to(roomCode).emit('playlist:updated', { playlist: room.playlist });
            } catch (err) {
                socket.emit('error', { message: err.message });
            }
        });

        socket.on('playlist:like', async ({ roomCode, songId }) => {
            try {
                const room = await Room.findOne({ code: roomCode });
                if (!room) return;

                const song = room.playlist.find((s) => s.id === songId);
                if (!song) return;

                const likeIdx = song.likes.indexOf(userId);
                if (likeIdx >= 0) song.likes.splice(likeIdx, 1);
                else song.likes.push(userId);

                await room.save();
                io.to(roomCode).emit('playlist:updated', { playlist: room.playlist });
            } catch (err) {
                socket.emit('error', { message: err.message });
            }
        });

        socket.on('playlist:play-song', async ({ roomCode, index }) => {
            try {
                const room = await Room.findOne({ code: roomCode });
                if (!room || !canControl(room, userId)) return;

                room.currentSongIndex = index;
                room.playbackState = { isPlaying: true, currentTime: 0, updatedAt: new Date() };
                await room.save();

                io.to(roomCode).emit('playlist:song-changed', {
                    currentSongIndex: room.currentSongIndex,
                    playbackState: room.playbackState,
                });
            } catch (err) {
                socket.emit('error', { message: err.message });
            }
        });

        // ── CHAT ──────────────────────────────────────────────────────────────────
        socket.on('chat:message', ({ roomCode, text }) => {
            if (!text?.trim()) return;
            const msg = {
                id: uuidv4(),
                user: userInfo,
                text: text.trim(),
                createdAt: new Date().toISOString(),
            };
            io.to(roomCode).emit('chat:message', msg);
        });

        // ── ADMIN CONTROLS ────────────────────────────────────────────────────────
        socket.on('admin:give-control', async ({ roomCode, targetUserId }) => {
            try {
                const room = await Room.findOne({ code: roomCode });
                if (!room) return;
                const adminId = room.admin._id ? room.admin._id.toString() : room.admin.toString();
                if (adminId !== userId) return;

                room.controlledBy = targetUserId === adminId ? null : targetUserId;
                await room.save();

                io.to(roomCode).emit('admin:control-changed', { controlledBy: room.controlledBy });
                await addActivity(room, 'control', `${socket.user.name} gave control to another user`, userInfo);
                io.to(roomCode).emit('activity-log', { log: room.activityLog });
                await room.save();
            } catch (err) {
                socket.emit('error', { message: err.message });
            }
        });

        socket.on('admin:remove-user', async ({ roomCode, targetUserId }) => {
            try {
                const room = await Room.findOne({ code: roomCode });
                if (!room) return;
                const adminId = room.admin._id ? room.admin._id.toString() : room.admin.toString();
                if (adminId !== userId) return;

                const targetUser = room.users.find((u) => u._id === targetUserId);
                room.users = room.users.filter((u) => u._id !== targetUserId);

                const targetSocket = room.users.find((u) => u._id === targetUserId)?.socketId;
                if (targetSocket) io.to(targetSocket).emit('kicked', { message: 'You were removed from the room' });

                await addActivity(room, 'kick', `${socket.user.name} removed ${targetUser?.name}`, userInfo);
                await room.save();

                io.to(roomCode).emit('users-updated', { users: room.users });
                io.to(roomCode).emit('activity-log', { log: room.activityLog });
            } catch (err) {
                socket.emit('error', { message: err.message });
            }
        });

        // ── VOICE (WebRTC signaling) ───────────────────────────────────────────────
        socket.on('voice:offer', ({ roomCode, targetSocketId, offer }) => {
            io.to(targetSocketId).emit('voice:offer', { fromSocketId: socket.id, offer });
        });

        socket.on('voice:answer', ({ targetSocketId, answer }) => {
            io.to(targetSocketId).emit('voice:answer', { fromSocketId: socket.id, answer });
        });

        socket.on('voice:ice-candidate', ({ targetSocketId, candidate }) => {
            io.to(targetSocketId).emit('voice:ice-candidate', { fromSocketId: socket.id, candidate });
        });

        socket.on('voice:speaking', ({ roomCode, isSpeaking }) => {
            socket.to(roomCode).emit('voice:speaking', { userId, isSpeaking });
        });

        // ── DISCONNECT ────────────────────────────────────────────────────────────
        socket.on('disconnect', async () => {
            try {
                const roomCode = socket.roomCode;
                if (!roomCode) return;

                const room = await Room.findOne({ code: roomCode });
                if (!room) return;

                room.users = room.users.filter((u) => u._id !== userId);
                await addActivity(room, 'leave', `${socket.user.name} left the room`, userInfo);
                await room.save();

                io.to(roomCode).emit('users-updated', { users: room.users });
                io.to(roomCode).emit('activity-log', { log: room.activityLog });

                // Notify peers to close WebRTC connection
                socket.to(roomCode).emit('voice:peer-disconnected', { socketId: socket.id, userId });
            } catch (err) {
                console.error('Disconnect error:', err.message);
            }
        });
    });
};
