const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const { requireAdmin } = require('../middleware/requireAdmin');
const { requireUser } = require('../middleware/requireUser');
const { withdrawalPaymentMeta, requiredWithdrawalMinimumCoins, coinsToRupees, coinsFromRupees } = require('../utils/taskReward');

// Admin-facing view of a withdrawal: adds the user's coin balance, the payment
// summary (requested coins, rupees, conversion rate), and the minimum coins now
// required for this user's next withdrawal (approved-only ladder).
function adminWithdrawalView(withdrawal, approvedByUser) {
    const doc = withdrawal.toJSON();
    const userId = String(doc.userId?._id || doc.userId || '');
    const approvedCount = approvedByUser ? (approvedByUser.get(userId) || 0) : null;
    const minimumCoins = approvedCount === null ? null : requiredWithdrawalMinimumCoins(approvedCount);
    return {
        ...doc,
        ...withdrawalPaymentMeta(doc.amount),
        requiredMinimumCoins: minimumCoins,
        requiredMinimumRupees: minimumCoins === null ? null : coinsToRupees(minimumCoins)
    };
}

// Count of APPROVED withdrawals per user (rejected/pending never count).
async function approvedWithdrawalCounts() {
    const rows = await Withdrawal.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]);
    return new Map(rows.map(row => [String(row._id), row.count]));
}

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

        // Withdrawal minimum ladder (validated on the backend): the first
        // withdrawal needs at least 100 coins, +50 coins per approved
        // withdrawal (+50), capped at 500. Rejected/pending do not count.
        const approvedCount = await Withdrawal.countDocuments({ userId: req.user._id, status: 'approved' });
        const minimumCoins = requiredWithdrawalMinimumCoins(approvedCount);
        const requestedCoins = coinsFromRupees(amount);
        if (requestedCoins + 1e-9 < minimumCoins) {
            return res.status(400).json({
                error: `Minimum withdrawal is ${minimumCoins} coins (₹${coinsToRupees(minimumCoins).toFixed(2)}) for your next request.`,
                minimumCoins,
                minimumRupees: coinsToRupees(minimumCoins)
            });
        }

        // Validate the user's available balance on the backend (100 coins = ₹10).
        if (req.user.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance for withdrawal' });
        }

        // The user must hold the coins being withdrawn: coins are deducted on approval.
        if (req.user.points + 1e-9 < requestedCoins) {
            return res.status(400).json({ error: 'Not enough coins for this withdrawal' });
        }

        // Ensure the unique partial index that guarantees a single pending request
        // per user exists before we rely on it to reject concurrent duplicates.
        try {
            await Withdrawal.init();
        } catch (_err) {
            // If the index cannot be built (e.g. legacy duplicate pending rows already
            // exist), the explicit check below still blocks new duplicate requests.
        }

        // Friendly guard: reject if this user already has a pending request.
        const existingPending = await Withdrawal.findOne({ userId: req.user._id, status: 'pending' });
        if (existingPending) {
            return res.status(409).json({ error: 'You already have a pending withdrawal request' });
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
        // Atomic backstop: a concurrent request inserted the pending row first and
        // the unique partial index rejected this insert.
        if (err && err.code === 11000) {
            return res.status(409).json({ error: 'You already have a pending withdrawal request' });
        }
        return res.status(500).json({ error: 'Unable to create withdrawal request' });
    }
});

// GET /api/withdrawals - Get all withdrawals (useful for Admin panel)
// Archived (soft-deleted) rows are hidden by default; pass ?includeArchived=true
// to list them for review or restoration.
router.get('/', requireAdmin, async (req, res) => {
    try {
        const includeArchived = String(req.query.includeArchived || '').toLowerCase() === 'true';
        const filter = includeArchived ? {} : { archived: { $ne: true } };
        const approvedByUser = await approvedWithdrawalCounts();
        const withdrawals = await Withdrawal.find(filter)
            .populate('userId', 'name email phone points balance')
            .sort({ createdAt: -1 });
        res.json(withdrawals.map(w => adminWithdrawalView(w, approvedByUser)));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/withdrawals/mine - Current user's own withdrawal history.
// Limited to safe fields; admin-only fields such as adminNote are never exposed.
router.get('/mine', requireUser, async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find({ userId: req.user._id })
            .select('_id amount method status createdAt processedAt archived')
            .sort({ createdAt: -1 });
        res.json(withdrawals);
    } catch (err) {
        res.status(500).json({ error: 'Unable to load your withdrawal history' });
    }
});

// GET /api/withdrawals/:id - Get withdrawal by ID
router.get('/:id', requireAdmin, async (req, res) => {
    try {
        const withdrawal = await Withdrawal.findById(req.params.id).populate('userId', 'name email phone points balance');
        if (!withdrawal) return res.status(404).json({ error: 'Withdrawal request not found' });
        const userId = String(withdrawal.userId?._id || withdrawal.userId || '');
        const approvedByUser = new Map([[userId, await Withdrawal.countDocuments({ userId, status: 'approved' })]]);
        res.json(adminWithdrawalView(withdrawal, approvedByUser));
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

        // Only transition a withdrawal that is still 'pending'. This makes the
        // action idempotent: repeat or concurrent approvals can no longer deduct
        // the user's balance more than once.
        const updatedWithdrawal = await Withdrawal.findOneAndUpdate(
            { _id: req.params.id, status: 'pending' },
            { $set: updateData },
            { new: true }
        );

        // Nothing transitioned: the request is missing or was already processed.
        // Return the current record so repeat actions are harmless (no double deduction).
        if (!updatedWithdrawal) {
            const existing = await Withdrawal.findById(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Withdrawal request not found' });
            return res.json(existing);
        }

        // If approved, update user's totalWithdrawn and deduct balance exactly once.
        if (status === 'approved') {
            // Deduct both ledgers: the rupee wallet and the matching coins
            // (10 coins = ₹1, the same rate used when rewards are credited).
            await User.findByIdAndUpdate(updatedWithdrawal.userId, {
                $inc: {
                    points: -coinsFromRupees(updatedWithdrawal.amount),
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

// DELETE /api/withdrawals/:id - Soft-delete (archive) a withdrawal request (Admin only)
// Retention policy: approved (paid) records are financial audit records and are
// NEVER archived or deleted. Pending and rejected records can be archived to hide
// them from the default admin list; archiving never removes anything from the
// database and can be reversed with the restore route below.
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: 'Invalid withdrawal id' });
        }

        const withdrawal = await Withdrawal.findById(req.params.id);
        if (!withdrawal) return res.status(404).json({ error: 'Withdrawal request not found' });

        if (withdrawal.status === 'approved') {
            return res.status(409).json({
                error: 'Approved (paid) withdrawal records are financial audit records and cannot be deleted. Retention policy: they are retained permanently.',
                paidAuditRecord: true
            });
        }

        withdrawal.archived = true;
        withdrawal.archivedAt = new Date();
        await withdrawal.save();

        res.json({
            success: true,
            message: 'Withdrawal request archived. It is hidden from the default list and can be restored.',
            withdrawal
        });
    } catch (err) {
        res.status(500).json({ error: 'Unable to archive withdrawal request' });
    }
});

// PUT /api/withdrawals/:id/restore - Restore an archived withdrawal request (Admin only)
router.put('/:id/restore', requireAdmin, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: 'Invalid withdrawal id' });
        }

        const withdrawal = await Withdrawal.findById(req.params.id);
        if (!withdrawal) return res.status(404).json({ error: 'Withdrawal request not found' });

        withdrawal.archived = false;
        withdrawal.archivedAt = null;
        await withdrawal.save();

        res.json({ success: true, message: 'Withdrawal request restored', withdrawal });
    } catch (err) {
        res.status(500).json({ error: 'Unable to restore withdrawal request' });
    }
});

module.exports = router;
