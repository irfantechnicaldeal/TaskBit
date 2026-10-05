const express = require('express');
const router = express.Router();
const BankDetails = require('../models/BankDetails');
const { requireAdmin } = require('../middleware/requireAdmin');

// POST /api/bank-details - Create or Add bank details
router.post('/', async (req, res) => {
    try {
        const { userId } = req.body;
        // Check if bank details already exist for this user
        let existing = await BankDetails.findOne({ userId });
        if (existing) {
            existing = await BankDetails.findOneAndUpdate(
                { userId },
                { ...req.body, updatedAt: Date.now() },
                { new: true }
            );
            return res.json(existing);
        }

        const newBank = new BankDetails(req.body);
        const savedBank = await newBank.save();
        res.status(201).json(savedBank);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/bank-details/:userId - Get bank details by userId
router.get('/:userId', async (req, res) => {
    try {
        const bankDetails = await BankDetails.findOne({ userId: req.params.userId });
        if (!bankDetails) return res.status(404).json({ error: 'Bank details not found for this user' });
        res.json(bankDetails);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/bank-details/:userId - Update bank details by userId
router.put('/:userId', requireAdmin, async (req, res) => {
    try {
        const updatedBank = await BankDetails.findOneAndUpdate(
            { userId: req.params.userId },
            { ...req.body, updatedAt: Date.now() },
            { new: true }
        );
        if (!updatedBank) return res.status(404).json({ error: 'Bank details not found for this user' });
        res.json(updatedBank);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
