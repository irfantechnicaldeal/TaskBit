const mongoose = require('mongoose');

const TaskCompletionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    cycle: { type: Number, required: true, min: 1 },
    // Integer units preserve the exact half-coin reward without rounding.
    rewardUnits: { type: Number, required: true, enum: [1], immutable: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

TaskCompletionSchema.index({ userId: 1, taskId: 1, cycle: 1 }, { unique: true });

module.exports = mongoose.model('TaskCompletion', TaskCompletionSchema);
