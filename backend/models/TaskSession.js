const mongoose = require('mongoose');

const TaskSessionSchema = new mongoose.Schema({
    sessionToken: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    cycle: { type: Number, required: true },
    status: { type: String, enum: ['active', 'invalidated', 'completed'], default: 'active', index: true },
    invalidationReason: { type: String, default: '' },
    startTime: { type: Date, required: true, default: Date.now },
    lastHeartbeat: { type: Date, required: true, default: Date.now },
    heartbeats: { type: [Date], default: () => [new Date()] },
    createdAt: { type: Date, default: Date.now, expires: 600 } // TTL 10 minutes
});

module.exports = mongoose.model('TaskSession', TaskSessionSchema);
