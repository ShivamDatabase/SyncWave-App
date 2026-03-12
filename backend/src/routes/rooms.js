const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Room = require('../models/Room');
const { protect } = require('../middleware/auth');

const router = express.Router();

function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Create room
router.post('/', protect, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'Room name required' });

        let code = generateCode();
        // ensure uniqueness
        while (await Room.findOne({ code })) code = generateCode();

        const room = await Room.create({
            name,
            code,
            admin: req.user._id,
            users: [{ _id: req.user._id.toString(), name: req.user.name, avatar: req.user.avatar, socketId: '' }],
        });

        res.status(201).json({ room });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get room by code
router.get('/:code', protect, async (req, res) => {
    try {
        const room = await Room.findOne({ code: req.params.code.toUpperCase() }).populate('admin', 'name email avatar');
        if (!room) return res.status(404).json({ message: 'Room not found' });
        res.json({ room });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
