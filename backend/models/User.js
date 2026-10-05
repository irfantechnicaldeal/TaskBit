const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, default: '' },
    passwordHash: { type: String, required: true },
    points: { type: Number, default: 0 },
    // One taskRewardUnit is exactly half a coin; points continues to store coins.
    taskRewardUnits: { type: Number, default: 0, min: 0 },
    currentTaskCycle: { type: Number, default: 1, min: 1 },
    balance: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

// Exclude passwordHash from JSON responses automatically
UserSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.passwordHash;
    return obj;
};

module.exports = mongoose.model('User', UserSchema);
