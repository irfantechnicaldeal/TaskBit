const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const BankDetails = require('../models/BankDetails');
const TaskCompletion = require('../models/TaskCompletion');
const TaskSession = require('../models/TaskSession');
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

// DELETE /api/users/:id - Permanently remove a user and their user-specific data (Admin only)
// Financial-history guard (Policy A): a user with any APPROVED (paid) withdrawal is NOT
// deleted, so paid financial records can never be lost. Users with no paid history are
// fully removed. Every delete is scoped to this userId, so other users and the global
// tasks/admins collections are never affected.
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: 'Invalid user id' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Never destroy paid (approved) withdrawal history.
        const paidCount = await Withdrawal.countDocuments({ userId: user._id, status: 'approved' });
        if (paidCount > 0) {
            return res.status(409).json({
                error: 'This user has paid withdrawal history that must be retained. Resolve or archive it before deleting the account.',
                paidWithdrawals: paidCount
            });
        }

        // Remove the account, coin balance, wallet, and all user-specific data.
        // Ordered children-first so the User document is removed last.
        await BankDetails.deleteMany({ userId: user._id });    // payout/bank info
        await TaskCompletion.deleteMany({ userId: user._id }); // coin-earning ledger
        await TaskSession.deleteMany({ userId: user._id });    // ephemeral task sessions
        await Withdrawal.deleteMany({ userId: user._id });     // pending + rejected (no money moved)
        await User.deleteOne({ _id: user._id });               // account + points + balance

        res.json({ success: true, message: 'User and associated data deleted', deletedUserId: user._id });
    } catch (err) {
        res.status(500).json({ error: 'Unable to delete user' });
    }
});

module.exports = router;
