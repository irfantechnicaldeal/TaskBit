const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const test = require('node:test');
const jwt = require('jsonwebtoken');
const { requireUser } = require('../middleware/requireUser');
const { REWARD_UNITS_PER_TASK, coinsFromRewardUnits } = require('../utils/taskReward');

function responseRecorder() {
    return {
        statusCode: 200,
        payload: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.payload = payload; return this; }
    };
}

test('integer reward units preserve the requested coin totals exactly', () => {
    assert.equal(REWARD_UNITS_PER_TASK, 1);
    assert.equal(coinsFromRewardUnits(100), 50);
    assert.equal(coinsFromRewardUnits(200), 100);
    assert.equal(coinsFromRewardUnits(1000), 500);
    assert.equal(coinsFromRewardUnits(2000), 1000);
    assert.throws(() => coinsFromRewardUnits(0.5), TypeError);
});

test('missing JWT is rejected with HTTP 401', async () => {
    const response = responseRecorder();
    await requireUser({ get: () => undefined }, response, () => assert.fail('next must not run'));
    assert.equal(response.statusCode, 401);
});

test('invalid JWT is rejected with HTTP 401', async () => {
    const oldSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
    try {
        const response = responseRecorder();
        await requireUser({ get: () => 'Bearer invalid-token' }, response, () => assert.fail('next must not run'));
        assert.equal(response.statusCode, 401);
    } finally {
        if (oldSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = oldSecret;
    }
});

const testMongoUri = process.env.TASKBIT_TEST_MONGO_URI;
test('MongoDB task completion, cycle, and concurrency integration', { skip: !testMongoUri }, async () => {
    const uri = new URL(testMongoUri);
    assert.match(uri.pathname.toLowerCase(), /test/, 'Use a dedicated MongoDB database whose name includes "test"');

    const mongoose = require('mongoose');
    const express = require('express');
    const Task = require('../models/Task');
    const User = require('../models/User');
    const TaskCompletion = require('../models/TaskCompletion');
    const Admin = require('../models/Admin');
    const taskRoutes = require('../routes/taskRoutes');
    const userRoutes = require('../routes/userRoutes');
    const { requireAdmin, COOKIE_NAME } = require('../middleware/requireAdmin');
    const previousSecret = process.env.JWT_SECRET;
    const previousAdminSecret = process.env.ADMIN_JWT_SECRET;
    const previousAdminOrigin = process.env.ADMIN_PANEL_ORIGIN;
    const testSecret = crypto.randomBytes(32).toString('hex');
    const testAdminSecret = crypto.randomBytes(32).toString('hex');
    const createdUserIds = [];
    const createdTaskIds = [];
    const createdAdminIds = [];
    let server;

    process.env.JWT_SECRET = testSecret;
    process.env.ADMIN_JWT_SECRET = testAdminSecret;
    process.env.ADMIN_PANEL_ORIGIN = 'http://localhost:3001';
    try {
        await mongoose.connect(testMongoUri, { serverSelectionTimeoutMS: 5000 });
        assert.equal(await Task.countDocuments({}), 0, 'The dedicated integration database must have no tasks');
        assert.equal(await TaskCompletion.countDocuments({}), 0, 'The dedicated integration database must have no task completions');
        await TaskCompletion.init();

        const app = express();
        app.use(express.json());
        app.use('/api/tasks', taskRoutes);
        app.use('/api/admin/tasks', requireAdmin, taskRoutes);
        app.use('/api/users', userRoutes);
        server = http.createServer(app);
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

        const makeUser = async suffix => {
            const user = await User.create({
                name: 'Task completion integration user',
                email: `task-completion-${crypto.randomUUID()}-${suffix}@example.test`,
                passwordHash: 'integration-test-only'
            });
            createdUserIds.push(user._id);
            const token = jwt.sign({ userId: user._id.toString(), email: user.email }, testSecret, { expiresIn: '5m' });
            return { user, token };
        };
        const send = async (path, { token, method = 'GET', body } = {}) => {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            if (body !== undefined) headers['Content-Type'] = 'application/json';
            return fetch(`${baseUrl}${path}`, {
                method,
                headers,
                body: body === undefined ? undefined : JSON.stringify(body)
            });
        };

        const firstUser = await makeUser('cycle');
        const tasks = await Task.create([
            { taskNumber: 1, title: 'Task #1. Watch Task - Start', youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', points: 999, status: 'Active' },
            { taskNumber: 2, title: 'Task #2. Watch Task - Start', youtubeUrl: 'https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe', points: 1, status: 'Active' },
            { taskNumber: 3, title: 'Task #3. Watch Task - Start', youtubeUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', points: 700, status: 'Active' },
            { title: 'Legacy integration task', youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', status: 'Active' },
            { title: 'Paused integration task', youtubeUrl: 'https://example.test/paused', status: 'Paused' },
            { title: 'Unconfigured integration task', status: 'Active' }
        ]);
        createdTaskIds.push(...tasks.map(task => task._id));
        const activeTasks = tasks.slice(0, 3);

        const unauthenticated = await send(`/tasks/${activeTasks[0]._id}/complete`, { method: 'POST' });
        assert.equal(unauthenticated.status, 401);

        for (const forbiddenBody of [
            { userId: new mongoose.Types.ObjectId().toString() },
            { reward: 1000 },
            { cycle: 999 }
        ]) {
            const response = await send(`/tasks/${activeTasks[0]._id}/complete`, {
                token: firstUser.token,
                method: 'POST',
                body: forbiddenBody
            });
            assert.equal(response.status, 400);
        }

        let taskListResponse = await send('/tasks', { token: firstUser.token });
        assert.equal(taskListResponse.status, 200);
        let taskList = await taskListResponse.json();
        assert.equal(taskList.length, 4, 'Paused tasks and active tasks without a URL are excluded; usable unnumbered tasks remain in the catalog');
        assert.ok(taskList.some(task => task.title === 'Legacy integration task'));
        assert.equal(taskList[0].completed, false);
        const sourceTaskOne = taskList.find(task => task.taskNumber === 1);
        assert.ok(sourceTaskOne);
        assert.equal(sourceTaskOne.title, 'Task #1. Watch Task - Start');
        assert.equal(sourceTaskOne.youtubeUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');

        const admin = await Admin.create({
            email: `task-sync-${crypto.randomUUID()}@example.test`,
            passwordHash: 'integration-test-only'
        });
        createdAdminIds.push(admin._id);
        const adminToken = jwt.sign(
            { sub: admin._id.toString(), sessionVersion: admin.sessionVersion },
            testAdminSecret,
            { issuer: 'taskbit-backend', audience: 'taskbit-admin', expiresIn: '5m' }
        );
        const adminTaskUrl = `${baseUrl}/admin/tasks/${activeTasks[0]._id}`;
        const updatePayload = {
            title: 'Task #1. Watch Task - Start',
            description: '',
            youtubeUrl: '  https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe  ',
            points: 4321,
            status: 'Active'
        };
        const adminAuthHeaders = {
            'Content-Type': 'application/json',
            Origin: 'http://localhost:3001',
            Cookie: `${COOKIE_NAME}=${encodeURIComponent(adminToken)}`
        };
        const adminListResponse = await fetch(`${baseUrl}/admin/tasks`, {
            headers: { Cookie: adminAuthHeaders.Cookie }
        });
        assert.equal(adminListResponse.status, 200, 'The protected Admin task list endpoint must load MongoDB tasks');
        const adminListedTasks = await adminListResponse.json();
        assert.ok(adminListedTasks.some(task => task._id === activeTasks[0]._id.toString()));
        const deniedUpdate = await fetch(adminTaskUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3001' },
            body: JSON.stringify(updatePayload)
        });
        assert.equal(deniedUpdate.status, 401, 'Admin task updates must reject requests without an admin session');
        const deniedCreate = await fetch(`${baseUrl}/admin/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3001' },
            body: JSON.stringify(updatePayload)
        });
        assert.equal(deniedCreate.status, 401, 'Admin task creation must reject requests without an admin session');
        const deniedDelete = await fetch(adminTaskUrl, {
            method: 'DELETE',
            headers: { Origin: 'http://localhost:3001' }
        });
        assert.equal(deniedDelete.status, 401, 'Admin task deletion must reject requests without an admin session');

        const adminUpdate = await fetch(adminTaskUrl, {
            method: 'PUT',
            headers: adminAuthHeaders,
            body: JSON.stringify(updatePayload)
        });
        assert.equal(adminUpdate.status, 200);
        const updatedByAdmin = await adminUpdate.json();
        assert.equal(updatedByAdmin._id, activeTasks[0]._id.toString(), 'Updating a task must preserve its MongoDB ID');
        assert.equal(updatedByAdmin.taskNumber, 1, 'Updating a task must preserve its task number');
        assert.equal(updatedByAdmin.description, '', 'A blank task description must be accepted');
        assert.equal(updatedByAdmin.youtubeUrl, updatePayload.youtubeUrl.trim(), 'Task URLs are trimmed before saving');
        assert.equal(updatedByAdmin.status, updatePayload.status);

        const createPayload = {
            title: 'Admin-created integration task',
            description: '',
            youtubeUrl: 'https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe',
            status: 'Active'
        };
        const adminCreate = await fetch(`${baseUrl}/admin/tasks`, {
            method: 'POST',
            headers: adminAuthHeaders,
            body: JSON.stringify(createPayload)
        });
        assert.equal(adminCreate.status, 201);
        const createdByAdmin = await adminCreate.json();
        createdTaskIds.push(new mongoose.Types.ObjectId(createdByAdmin._id));

        const refreshedAndroidList = await send('/tasks', { token: firstUser.token });
        assert.equal(refreshedAndroidList.status, 200);
        const tasksSeenByAndroid = await refreshedAndroidList.json();
        assert.equal(tasksSeenByAndroid.length, 5);
        assert.ok(tasksSeenByAndroid.some(task => task._id === createdByAdmin._id), 'Fresh Android task GET must include a newly created usable task');
        const syncedTask = tasksSeenByAndroid.find(task => task._id === activeTasks[0]._id.toString());
        assert.ok(syncedTask, 'The Android user task endpoint must return the existing task ID');
        assert.equal(syncedTask.title, updatePayload.title);
        assert.equal(syncedTask.description, updatePayload.description);
        assert.equal(syncedTask.taskNumber, 1);
        assert.equal(syncedTask.youtubeUrl, updatePayload.youtubeUrl.trim());
        assert.equal(syncedTask.status, updatePayload.status);

        const complete = taskId => send(`/tasks/${taskId}/complete`, { token: firstUser.token, method: 'POST' });
        let result = await complete(activeTasks[0]._id);
        assert.equal(result.status, 201);
        let payload = await result.json();
        assert.equal(payload.rewardUnits, 1);
        assert.equal(payload.rewardCoins, 0.5);
        assert.equal(payload.points, 0.5);
        assert.equal(payload.cycleCompleted, false);
        assert.equal(payload.currentCycle, 1);

        const duplicate = await complete(activeTasks[0]._id);
        assert.equal(duplicate.status, 409);
        assert.equal((await duplicate.json()).alreadyCompleted, true);
        assert.equal((await User.findById(firstUser.user._id)).points, 0.5);

        await Task.updateOne({ _id: activeTasks[0]._id }, { $set: { youtubeUrl: 'https://example.test/changed' } });
        assert.equal((await User.findById(firstUser.user._id)).currentTaskCycle, 1, 'Editing a URL must not reset or advance the cycle');

        result = await complete(activeTasks[1]._id);
        assert.equal(result.status, 201);
        payload = await result.json();
        assert.equal(payload.cycleCompleted, false, 'The cycle must remain open until every active task is complete');

        taskListResponse = await send('/tasks', { token: firstUser.token });
        taskList = await taskListResponse.json();
        assert.equal(taskList.find(task => task._id === activeTasks[0]._id.toString()).completed, true);

        result = await complete(activeTasks[2]._id);
        assert.equal(result.status, 201);
        payload = await result.json();
        assert.equal(payload.cycleCompleted, true, 'The last usable task completes the cycle');
        assert.equal(payload.completedTasks, 3);
        assert.equal(payload.totalTasks, 3);
        assert.equal(payload.currentCycle, 2);
        assert.equal((await User.findById(firstUser.user._id)).balance, 0, 'Task rewards must not modify rupee balance');

        taskListResponse = await send('/tasks', { token: firstUser.token });
        taskList = await taskListResponse.json();
        assert.equal(taskList.every(task => !task.completed), true, 'The next cycle makes the same tasks available again');

        result = await complete(activeTasks[0]._id);
        assert.equal(result.status, 201, 'The same task may reward again in the next cycle');
        assert.equal((await User.findById(firstUser.user._id)).points, 2);
        assert.equal(await TaskCompletion.countDocuments({ userId: firstUser.user._id, taskId: activeTasks[0]._id, cycle: 1 }), 1);
        assert.equal(await TaskCompletion.countDocuments({ userId: firstUser.user._id, taskId: activeTasks[0]._id, cycle: 2 }), 1);

        const concurrentUser = await makeUser('concurrent');
        const duplicateResults = await Promise.all([
            send(`/tasks/${activeTasks[0]._id}/complete`, { token: concurrentUser.token, method: 'POST' }),
            send(`/tasks/${activeTasks[0]._id}/complete`, { token: concurrentUser.token, method: 'POST' })
        ]);
        assert.deepEqual(duplicateResults.map(response => response.status).sort(), [201, 409]);
        assert.equal((await User.findById(concurrentUser.user._id)).points, 0.5);
        assert.equal(await TaskCompletion.countDocuments({ userId: concurrentUser.user._id, taskId: activeTasks[0]._id, cycle: 1 }), 1);

        const task50 = await Task.create({
            taskNumber: 50,
            title: 'Task #50. Watch Task - Start',
            youtubeUrl: 'https://youtu.be/LJqPssrMGu0?si=VFAQtmz_3VfFh8Qe',
            status: 'Active'
        });
        createdTaskIds.push(task50._id);
        const beforeDelete = await send('/tasks', { token: firstUser.token });
        assert.ok((await beforeDelete.json()).some(task => task._id === task50._id.toString()));
        const deleteTask = await fetch(`${baseUrl}/admin/tasks/${task50._id}`, {
            method: 'DELETE',
            headers: { Cookie: adminAuthHeaders.Cookie, Origin: adminAuthHeaders.Origin }
        });
        assert.equal(deleteTask.status, 200);
        const afterDelete = await send('/tasks', { token: firstUser.token });
        assert.equal((await afterDelete.json()).some(task => task._id === task50._id.toString()), false,
            'A fresh authenticated task GET must not return an Admin-deleted task');
    } finally {
        if (server) await new Promise(resolve => server.close(resolve));
        if (mongoose.connection.readyState === 1) {
            if (createdUserIds.length) {
                await TaskCompletion.deleteMany({ userId: { $in: createdUserIds } });
                await User.deleteMany({ _id: { $in: createdUserIds } });
            }
            if (createdTaskIds.length) await Task.deleteMany({ _id: { $in: createdTaskIds } });
            if (createdAdminIds.length) await Admin.deleteMany({ _id: { $in: createdAdminIds } });
            await mongoose.disconnect();
        }
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
        if (previousAdminSecret === undefined) delete process.env.ADMIN_JWT_SECRET;
        else process.env.ADMIN_JWT_SECRET = previousAdminSecret;
        if (previousAdminOrigin === undefined) delete process.env.ADMIN_PANEL_ORIGIN;
        else process.env.ADMIN_PANEL_ORIGIN = previousAdminOrigin;
    }
});
