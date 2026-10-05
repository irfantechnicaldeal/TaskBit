const mongoose = require('mongoose');

const BankDetailsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    accountHolderName: { type: String, required: true },
    bankName: { type: String, required: function() { return !this.upiId; } },
    accountNumber: { type: String, required: function() { return !this.upiId; } },
    ifsc: { type: String, required: function() { return !this.upiId; } },
    upiId: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BankDetails', BankDetailsSchema);
