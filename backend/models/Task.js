const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    completed: { type: Boolean, default: false },
    youtubeUrl: { type: String, default: '' },
    userId: { type: String, default: '' },
    points: { type: Number, default: 0 },
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
