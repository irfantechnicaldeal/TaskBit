const mongoose = require('mongoose');
const { DEFAULT_TASK_COIN_REWARD } = require('../utils/taskReward');

const TaskCompletionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    cycle: { type: Number, required: true, min: 1 },
    // Integer units preserve the exact reward without floating point drift;
    // 1 unit = 0.5 coin, so rewardUnits = coinReward * 2.
    rewardUnits: { type: Number, required: true, min: 0, immutable: true },
    // Coins actually credited for this completion, recorded at completion time
    // so history always shows the reward that was paid even if an admin later
    // changes the task's coin reward. Legacy rows (before per-task rewards)
    // read back as the 0.5-coin default, matching what they credited.
    rewardCoins: { type: Number, required: true, min: 0, default: DEFAULT_TASK_COIN_REWARD, immutable: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

TaskCompletionSchema.index({ userId: 1, taskId: 1, cycle: 1 }, { unique: true });

module.exports = mongoose.model('TaskCompletion', TaskCompletionSchema);
