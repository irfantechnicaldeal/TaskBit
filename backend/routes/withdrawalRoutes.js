const express = require('express');
const router = express.Router();
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');

// POST /api/withdrawals - Request a withdrawal
router.post('/', async (req, res) => {
    try {
        const { userId, amount } = req.body;

        // Optional: Check if user has enough balance/points
        const user = await User.findById(userId);
        if (user && user.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance for withdrawal' });
        }

        const newWithdrawal = new Withdrawal(req.body);
        const savedWithdrawal = await newWithdrawal.save();
        res.status(201).json(savedWithdrawal);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/withdrawals - Get all withdrawals (useful for Admin panel)
router.get('/', async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find().populate('userId', 'name email phone').sort({ createdAt: -1 });
        res.json(withdrawals);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/withdrawals/:id - Get withdrawal by ID
router.get('/:id', async (req, res) => {
    try {
        const withdrawal = await Withdrawal.findById(req.params.id).populate('userId', 'name email phone');
        if (!withdrawal) return res.status(404).json({ error: 'Withdrawal request not found' });
        res.json(withdrawal);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/withdrawals/:id/status - Update withdrawal status (pending / approved / rejected)
router.put('/:id/status', async (req, res) => {
    try {
        const { status, adminNote } = req.body;
        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }

        const updateData = {
            status,
            processedAt: Date.now()
        };
        if (adminNote !== undefined) updateData.adminNote = adminNote;

        const updatedWithdrawal = await Withdrawal.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );

        if (!updatedWithdrawal) return res.status(404).json({ error: 'Withdrawal request not found' });

        // If approved, update user's totalWithdrawn and deduct balance
        if (status === 'approved') {
            await User.findByIdAndUpdate(updatedWithdrawal.userId, {
                $inc: {
                    balance: -updatedWithdrawal.amount,
                    totalWithdrawn: updatedWithdrawal.amount
                }
            });
        }

        res.json(updatedWithdrawal);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
