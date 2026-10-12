const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Task = require('../models/Task');
const TaskCompletion = require('../models/TaskCompletion');
const User = require('../models/User');
const { requireAdmin } = require('../middleware/requireAdmin');
const { requireUser } = require('../middleware/requireUser');
const {
    DEFAULT_TASK_COIN_REWARD,
    coinsToRupees,
    resolveTaskCoinReward,
    rewardUnitsFromCoins,
    normalizeCoinReward
} = require('../utils/taskReward');

const MAX_TASK_POINTS = 1000000;

const activeTaskFilter = {
    $and: [
        { $or: [{ status: 'Active' }, { status: { $exists: false } }] },
        { youtubeUrl: { $type: 'string', $regex: /\S/ } }
    ]
};

// The mobile catalog returns every usable active task, including newly created
// unnumbered tasks. The numbered-only filter above remains the completion/cycle set.
const mobileTaskListFilter = {
    $and: [
        { $or: [{ status: 'Active' }, { status: { $exists: false } }] },
        { youtubeUrl: { $type: 'string', $regex: /\S/ } }
    ]
};

async function optionalUserForMobileTaskList(req, res, next) {
    if (req.baseUrl.startsWith('/api/admin/')) return next();

    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) {
        req.user = null;
        return next();
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        req.user = null;
        return next();
    }

    try {
        const payload = jwt.verify(match[1].trim(), secret, { algorithms: ['HS256'] });
        if (payload && typeof payload === 'object' && typeof payload.userId === 'string' && mongoose.isValidObjectId(payload.userId)) {
            const user = await User.findById(payload.userId);
            if (user) req.user = user;
        }
    } catch (_err) {
        req.user = null;
    }
    return next();
}

// Build a validated, whitelisted task payload so only expected fields can be
// written (no mass assignment) and reward values are always valid.
function buildTaskPayload(body) {
    const payload = {};
    const errors = [];
    const source = body && typeof body === 'object' && !Array.isArray(body) ? body : {};

    if (source.title !== undefined) {
        if (typeof source.title !== 'string' || !source.title.trim()) errors.push('Task title is required');
        else payload.title = source.title.trim();
    }
    if (source.description !== undefined) {
        if (typeof source.description !== 'string') errors.push('Description must be text');
        else payload.description = source.description.trim();
    }
    if (source.youtubeUrl !== undefined) {
        if (typeof source.youtubeUrl !== 'string') errors.push('Video URL must be text');
        else payload.youtubeUrl = source.youtubeUrl.trim();
    }
    if (source.points !== undefined) {
        const points = Number(source.points);
        if (!Number.isFinite(points) || points < 0 || points > MAX_TASK_POINTS) {
            errors.push('Task points must be a number between 0 and 1000000');
        } else {
            payload.points = Math.round(points);
        }
    }
    if (source.status !== undefined) {
        if (!['Active', 'Paused'].includes(source.status)) errors.push("Status must be 'Active' or 'Paused'");
        else payload.status = source.status;
    }
    if (source.taskNumber !== undefined && source.taskNumber !== null && source.taskNumber !== '') {
        const num = Number(source.taskNumber);
        if (!Number.isInteger(num) || num < 1 || num > 50) errors.push('Task number must be an integer from 1 to 50');
        else payload.taskNumber = num;
    }
    if (source.coinReward !== undefined && source.coinReward !== null && source.coinReward !== '') {
        try {
            payload.coinReward = normalizeCoinReward(Number(source.coinReward));
        } catch (err) {
            errors.push(err.message);
        }
    }

    return { payload, errors };
}

async function getCurrentCycleAfterReconciliation(userId) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        const user = await User.findById(userId);
        if (!user) return 1;

        const cycle = user.currentTaskCycle || 1;
        const activeTasks = await Task.find(activeTaskFilter).select('_id').lean();
        if (activeTasks.length === 0) return cycle;

        const completedTasks = await TaskCompletion.countDocuments({
            userId: user._id,
            cycle,
            taskId: { $in: activeTasks.map(task => task._id) }
        });
        if (completedTasks !== activeTasks.length) return cycle;

        const cycleCondition = cycle === 1
            ? { $or: [{ currentTaskCycle: 1 }, { currentTaskCycle: { $exists: false } }] }
            : { currentTaskCycle: cycle };
        const advancedUser = await User.findOneAndUpdate(
            { _id: user._id, ...cycleCondition },
            { $set: { currentTaskCycle: cycle + 1 } },
            { new: true }
        );
        if (advancedUser) return advancedUser.currentTaskCycle;
    }

    const latestUser = await User.findById(userId).select('currentTaskCycle');
    return latestUser?.currentTaskCycle || 1;
}

// GET /api/tasks - Get all tasks (Preserved existing endpoint)
router.get('/', optionalUserForMobileTaskList, async (req, res) => {
    try {
        const isAdminRoute = req.baseUrl.startsWith('/api/admin/');
        const tasks = await Task.find(isAdminRoute ? {} : mobileTaskListFilter).sort({ taskNumber: 1, createdAt: -1 });
        if (isAdminRoute) return res.json(tasks);

        if (!req.user) {
            return res.json(tasks.map(task => ({
                ...task.toJSON(),
                completed: false,
                cycle: 1
            })));
        }

        const currentCycle = await getCurrentCycleAfterReconciliation(req.user._id);
        const completions = await TaskCompletion.find({
            userId: req.user._id,
            cycle: currentCycle,
            taskId: { $in: tasks.map(task => task._id) }
        }).select('taskId').lean();
        const completedIds = new Set(completions.map(completion => completion.taskId.toString()));
        return res.json(tasks.map(task => ({
            ...task.toJSON(),
            completed: completedIds.has(task._id.toString()),
            cycle: currentCycle
        })));
    } catch (_err) {
        return res.status(500).json({ error: 'Unable to load tasks' });
    }
});

// POST /api/tasks/:taskId/complete - Complete a task for the authenticated user's current cycle
router.post('/:taskId/complete', (req, res, next) => {
    if (req.baseUrl.startsWith('/api/admin/')) return res.status(404).json({ error: 'Route not found' });
    return requireUser(req, res, next);
}, async (req, res) => {
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        return res.status(400).json({ error: 'Task completion does not accept user, cycle, or reward values' });
    }
    let taskQuery;
    if (mongoose.isValidObjectId(req.params.taskId)) {
        taskQuery = { _id: req.params.taskId, ...activeTaskFilter };
    } else {
        const numMatch = req.params.taskId.match(/\d+/);
        const taskNum = numMatch ? parseInt(numMatch[0], 10) : NaN;
        if (!isNaN(taskNum) && taskNum >= 1 && taskNum <= 50) {
            taskQuery = { taskNumber: taskNum, ...activeTaskFilter };
        } else {
            taskQuery = { _id: req.params.taskId, ...activeTaskFilter };
        }
    }

    let session;
    let outcome;
    try {
        // Ensure the unique user/task/cycle index exists before handling concurrent requests.
        await TaskCompletion.init();
        session = await mongoose.startSession();
        await session.withTransaction(async () => {
            const user = await User.findById(req.user._id).session(session);
            if (!user) {
                outcome = { kind: 'user-missing' };
                return;
            }

            const task = await Task.findOne(taskQuery).session(session);
            if (!task) {
                outcome = { kind: 'task-unavailable' };
                return;
            }

            const activeTasks = await Task.find(activeTaskFilter).select('_id').session(session).lean();
            if (activeTasks.length === 0) {
                outcome = { kind: 'no-active-tasks' };
                return;
            }

            const cycle = user.currentTaskCycle || 1;
            const existing = await TaskCompletion.findOne({
                userId: user._id,
                taskId: task._id,
                cycle
            }).session(session);
            if (existing) {
                outcome = { kind: 'already-completed', points: user.points || 0, currentCycle: cycle };
                return;
            }

            // The reward comes from the task document in the database; the
            // request body is already rejected above so users can never
            // influence their own reward from the client.
            const rewardCoins = resolveTaskCoinReward(task);
            const rewardUnits = rewardUnitsFromCoins(rewardCoins);
            const earnedRupees = coinsToRupees(rewardCoins);

            await TaskCompletion.create([{
                userId: user._id,
                taskId: task._id,
                cycle,
                rewardUnits,
                rewardCoins
            }], { session });

            const taskIds = activeTasks.map(activeTask => activeTask._id);
            const completedTasks = await TaskCompletion.countDocuments({
                userId: user._id,
                cycle,
                taskId: { $in: taskIds }
            }).session(session);
            const totalTasks = taskIds.length;
            const cycleCompleted = completedTasks === totalTasks;

            // 2 reward units = 1 coin. Each completion credits the task's
            // configured coin reward.
            user.taskRewardUnits = (user.taskRewardUnits || 0) + rewardUnits;
            user.points = Number(((user.points || 0) + rewardCoins).toFixed(2));
            user.balance = Number(((user.balance || 0) + earnedRupees).toFixed(2));
            user.totalEarned = Number(((user.totalEarned || 0) + earnedRupees).toFixed(2));
            user.currentTaskCycle = cycleCompleted ? cycle + 1 : cycle;
            await user.save({ session });

            outcome = {
                kind: 'completed',
                points: user.points,
                rewardUnits,
                rewardCoins,
                rewardRupees: earnedRupees,
                balance: user.balance,
                totalEarned: user.totalEarned,
                completedCycle: cycle,
                currentCycle: user.currentTaskCycle,
                cycleCompleted,
                completedTasks,
                totalTasks
            };
        });

        if (!outcome || outcome.kind === 'user-missing') {
            return res.status(401).json({ error: 'Authenticated user no longer exists' });
        }
        if (outcome.kind === 'task-unavailable') {
            return res.status(404).json({ error: 'Task is not available' });
        }
        if (outcome.kind === 'no-active-tasks') {
            return res.status(409).json({ error: 'There are no active tasks in this cycle' });
        }
        if (outcome.kind === 'already-completed') {
            return res.status(409).json({
                error: 'Task already completed for the current cycle',
                alreadyCompleted: true,
                points: outcome.points,
                currentCycle: outcome.currentCycle
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Task completed and reward credited',
            points: outcome.points,
            rewardUnits: outcome.rewardUnits,
            rewardCoins: outcome.rewardCoins,
            rewardRupees: outcome.rewardRupees,
            balance: outcome.balance,
            totalEarned: outcome.totalEarned,
            completedCycle: outcome.completedCycle,
            currentCycle: outcome.currentCycle,
            cycleCompleted: outcome.cycleCompleted,
            completedTasks: outcome.completedTasks,
            totalTasks: outcome.totalTasks
        });
    } catch (err) {
        if (err && err.code === 11000) {
            return res.status(409).json({ error: 'Task already completed for the current cycle', alreadyCompleted: true });
        }
        // MongoDB transactions require a replica set or sharded cluster.
        if (err && (err.code === 20 || /transaction numbers are only allowed/i.test(err.message || ''))) {
            return res.status(503).json({ error: 'Task rewards require transactional MongoDB support' });
        }
        return res.status(500).json({ error: 'Unable to complete task' });
    } finally {
        if (session) await session.endSession();
    }
});

// POST /api/tasks - Create a new task (Admin only; validated field whitelist)
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { payload, errors } = buildTaskPayload(req.body || {});
        if (errors.length > 0) return res.status(400).json({ error: errors.join(' ') });
        if (payload.title === undefined) return res.status(400).json({ error: 'Task title is required' });

        const newTask = new Task({ ...payload, status: payload.status || 'Active' });
        const savedTask = await newTask.save();
        res.status(201).json(savedTask);
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/tasks/:id - Update task (Admin only; validated field whitelist)
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const { payload, errors } = buildTaskPayload(req.body || {});
        if (errors.length > 0) return res.status(400).json({ error: errors.join(' ') });

        let query;
        if (mongoose.isValidObjectId(req.params.id)) {
            query = { _id: req.params.id };
        } else {
            const numMatch = req.params.id.match(/\d+/);
            const taskNum = numMatch ? parseInt(numMatch[0], 10) : NaN;
            if (!isNaN(taskNum) && taskNum >= 1 && taskNum <= 50) {
                query = { taskNumber: taskNum };
            } else {
                query = { _id: req.params.id };
            }
        }

        let updatedTask = await Task.findOneAndUpdate(
            query,
            { $set: payload },
            { new: true, runValidators: true }
        );

        if (!updatedTask && query.taskNumber) {
            updatedTask = await Task.findOneAndUpdate(
                query,
                { $set: { ...payload, createdAt: new Date() } },
                { new: true, upsert: true, runValidators: true }
            );
        }

        if (!updatedTask) return res.status(404).json({ error: 'Task not found' });
        res.json(updatedTask);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/tasks/:id - Delete task (Preserved existing endpoint)
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const deletedTask = await Task.findByIdAndDelete(req.params.id);
        if (!deletedTask) return res.status(404).json({ error: 'Task not found' });
        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
