const mongoose = require('mongoose');

const WithdrawalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
    adminNote: { type: String, default: '' },
    // Soft-delete (archive) support for the admin panel. Records are never
    // removed from the database; archived rows are hidden from the default
    // admin list and can be restored at any time.
    archived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, default: null }
});

// Guarantee at most ONE pending withdrawal per user. This is the atomic,
// database-level guard against duplicate submissions (repeated clicks or
// concurrent requests). Approved/rejected history is unaffected because the
// partial filter only indexes documents still in 'pending' status.
WithdrawalSchema.index(
    { userId: 1 },
    { unique: true, partialFilterExpression: { status: 'pending' } }
);

module.exports = mongoose.model('Withdrawal', WithdrawalSchema);
