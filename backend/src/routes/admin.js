const express = require('express');
const User = require('../models/User');
const Room = require('../models/Room');
const { protect } = require('../middleware/auth');

const router = express.Router();

const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied: Admins only' });
    }
};

// Apply auth and admin check to all routes
router.use(protect, requireAdmin);

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json({ users });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update user role or ban status
router.put('/users/:id', async (req, res) => {
    try {
        const { role, isBanned } = req.body;
        const user = await User.findById(req.params.id);
        
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // Prevent admin from removing their own admin status or banning themselves
        if (req.user._id.toString() === user._id.toString()) {
             if (role !== undefined && role !== 'admin') return res.status(400).json({ message: 'Cannot remove your own admin role' });
             if (isBanned === true) return res.status(400).json({ message: 'Cannot ban yourself' });
        }

        if (role !== undefined) user.role = role;
        if (isBanned !== undefined) user.isBanned = isBanned;
        
        await user.save();
        res.json({ user: user.toPublic() });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all rooms
router.get('/rooms', async (req, res) => {
    try {
        const rooms = await Room.find({}).populate('admin', 'name email');
        res.json({ rooms });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete a room
router.delete('/rooms/:id', async (req, res) => {
    try {
        const room = await Room.findByIdAndDelete(req.params.id);
        if (!room) return res.status(404).json({ message: 'Room not found' });
        res.json({ message: 'Room deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
