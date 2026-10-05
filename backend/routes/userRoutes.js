const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAdmin } = require('../middleware/requireAdmin');
const { requireUser } = require('../middleware/requireUser');

// GET /api/users/me - Return safe profile fields for the authenticated user.
router.get('/me', requireUser, (req, res) => {
    const user = req.user;
    res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        points: user.points,
        taskRewardUnits: user.taskRewardUnits || 0,
        currentTaskCycle: user.currentTaskCycle || 1,
        balance: user.balance,
        totalEarned: user.totalEarned,
        totalWithdrawn: user.totalWithdrawn,
        createdAt: user.createdAt
    });
});

// POST /api/users - Create user
router.post('/', requireAdmin, async (req, res) => {
    try {
        const newUser = new User(req.body);
        const savedUser = await newUser.save();
        res.status(201).json(savedUser);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/users - Get all users (useful for Admin panel)
router.get('/', requireAdmin, async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/users/:id - Update user details
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedUser) return res.status(404).json({ error: 'User not found' });
        res.json(updatedUser);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/users/:id/points - Points API (update points, balance, totalEarned)
router.put('/:id/points', requireAdmin, async (req, res) => {
    try {
        const { points, balance, totalEarned, totalWithdrawn } = req.body;
        const updateData = {};
        if (points !== undefined) updateData.points = points;
        if (balance !== undefined) updateData.balance = balance;
        if (totalEarned !== undefined) updateData.totalEarned = totalEarned;
        if (totalWithdrawn !== undefined) updateData.totalWithdrawn = totalWithdrawn;

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );
        if (!updatedUser) return res.status(404).json({ error: 'User not found' });
        res.json(updatedUser);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
