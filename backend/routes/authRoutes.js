const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'taskbit_secure_jwt_secret_key_2026';

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, ...(phone ? [{ phone }] : [])] });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email or phone already exists' });
        }

        // Hash password securely using bcryptjs
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            email,
            phone: phone || '',
            passwordHash
        });

        const savedUser = await newUser.save();

        // Generate secure authentication token (JWT)
        const token = jwt.sign({ userId: savedUser._id, email: savedUser.email }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: savedUser // toJSON automatically strips passwordHash
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { identifier, email, phone, mobile, password } = req.body;
        const loginId = identifier || email || phone || mobile;

        if (!loginId || !password) {
            return res.status(400).json({ error: 'Mobile/Email and password are required' });
        }

        // Find user by email or phone
        const user = await User.findOne({ $or: [{ email: loginId }, { phone: loginId }] });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email/mobile or password' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email/mobile or password' });
        }

        // Generate secure authentication token (JWT)
        const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'Login successful',
            token,
            user // toJSON automatically strips passwordHash
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
