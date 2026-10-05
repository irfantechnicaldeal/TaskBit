const express = require('express');
const router = express.Router();
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const { requireAdmin } = require('../middleware/requireAdmin');
const { requireUser } = require('../middleware/requireUser');

// POST /api/withdrawals - Request a withdrawal
router.post('/', requireUser, async (req, res) => {
    try {
        const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
        const authenticatedUserId = req.user._id.toString();
        const hasBodyUserId = Object.prototype.hasOwnProperty.call(body, 'userId');
        if (hasBodyUserId && String(body.userId) !== authenticatedUserId) {
            return res.status(403).json({ error: 'Withdrawal user does not match authenticated user' });
        }

        const { amount, method } = body;
        if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Amount must be a positive number' });
        }
        if (typeof method !== 'string' || !method.trim()) {
            return res.status(400).json({ error: 'Withdrawal method is required' });
        }

        if (req.user.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance for withdrawal' });
        }

        const newWithdrawal = new Withdrawal({
            userId: req.user._id,
            amount,
            method: method.trim()
        });
        const savedWithdrawal = await newWithdrawal.save();
        res.status(201).json(savedWithdrawal);
    } catch (err) {
        if (err.name === 'ValidationError' || err.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid withdrawal data' });
        }
        return res.status(500).json({ error: 'Unable to create withdrawal request' });
    }
});

// GET /api/withdrawals - Get all withdrawals (useful for Admin panel)
router.get('/', requireAdmin, async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find().populate('userId', 'name email phone').sort({ createdAt: -1 });
        res.json(withdrawals);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/withdrawals/:id - Get withdrawal by ID
router.get('/:id', requireAdmin, async (req, res) => {
    try {
        const withdrawal = await Withdrawal.findById(req.params.id).populate('userId', 'name email phone');
        if (!withdrawal) return res.status(404).json({ error: 'Withdrawal request not found' });
        res.json(withdrawal);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/withdrawals/:id/status - Update withdrawal status (pending / approved / rejected)
router.put('/:id/status', requireAdmin, async (req, res) => {
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
