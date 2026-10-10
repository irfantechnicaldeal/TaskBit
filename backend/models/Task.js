const mongoose = require('mongoose');
const { DEFAULT_TASK_COIN_REWARD, isValidCoinReward } = require('../utils/taskReward');

const TaskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    completed: { type: Boolean, default: false },
    youtubeUrl: { type: String, default: '' },
    userId: { type: String, default: '' },
    points: { type: Number, default: 0 },
    // Coins credited to the user when this task is completed. Configurable per
    // task from the admin panel; defaults to the legacy 0.5-coin reward.
    coinReward: {
        type: Number,
        default: DEFAULT_TASK_COIN_REWARD,
        validate: {
            validator: (value) => isValidCoinReward(value),
            message: 'Coin reward must be between 0 and 1000 coins in 0.5 increments'
        }
    },
    taskNumber: {
        type: Number,
        min: 1,
        max: 50,
        immutable: true,
        validate: { validator: Number.isInteger, message: 'taskNumber must be an integer from 1 to 50' }
    },
    status: { type: String, enum: ['Active', 'Paused'], default: 'Active', index: true }
}, { timestamps: true });

TaskSchema.index(
    { taskNumber: 1 },
    { unique: true, partialFilterExpression: { taskNumber: { $type: 'number' } } }
);

module.exports = mongoose.model('Task', TaskSchema);
