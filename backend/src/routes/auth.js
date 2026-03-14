const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password)
            return res.status(400).json({ message: 'All fields required' });

        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ message: 'Email already in use' });

        const user = await User.create({ name, email, password });
        const token = signToken(user._id);
        res.status(201).json({ token, user: user.toPublic() });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !user.password) return res.status(400).json({ message: 'Invalid credentials' });

        if (user.isBanned) return res.status(403).json({ message: 'Your account has been banned.' });

        const valid = await user.comparePassword(password);
        if (!valid) return res.status(400).json({ message: 'Invalid credentials' });

        const token = signToken(user._id);
        res.json({ token, user: user.toPublic() });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get current user
router.get('/me', protect, (req, res) => {
    res.json({ user: req.user.toPublic() });
});

module.exports = router;
