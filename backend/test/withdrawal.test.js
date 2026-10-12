const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const test = require('node:test');
const jwt = require('jsonwebtoken');

const testMongoUri = process.env.TASKBIT_TEST_MONGO_URI;

test('withdrawal duplicate, concurrency, and double-deduction protection', { skip: !testMongoUri }, async () => {
    const uri = new URL(testMongoUri);
    assert.match(uri.pathname.toLowerCase(), /test/, 'Use a dedicated MongoDB database whose name includes "test"');

    const mongoose = require('mongoose');
    const express = require('express');
    const User = require('../models/User');
    const Withdrawal = require('../models/Withdrawal');
    const Admin = require('../models/Admin');
    const withdrawalRoutes = require('../routes/withdrawalRoutes');
    const { requireAdmin, COOKIE_NAME } = require('../middleware/requireAdmin');

    const previousSecret = process.env.JWT_SECRET;
    const previousAdminSecret = process.env.ADMIN_JWT_SECRET;
    const previousAdminOrigin = process.env.ADMIN_PANEL_ORIGIN;
    const testSecret = crypto.randomBytes(32).toString('hex');
    const testAdminSecret = crypto.randomBytes(32).toString('hex');
    const createdUserIds = [];
    const createdAdminIds = [];
    let server;

    process.env.JWT_SECRET = testSecret;
    process.env.ADMIN_JWT_SECRET = testAdminSecret;
    process.env.ADMIN_PANEL_ORIGIN = 'http://localhost:3001';

    try {
        await mongoose.connect(testMongoUri, { serverSelectionTimeoutMS: 5000 });
        assert.equal(await Withdrawal.countDocuments({}), 0, 'The dedicated integration database must have no withdrawals');
        await Withdrawal.init();

        // The unique partial index is the core of the duplicate protection.
        const indexes = await Withdrawal.collection.indexes();
        const pendingGuard = indexes.find(index =>
            index.unique === true &&
            Object.keys(index.key).length === 1 &&
            index.key.userId === 1 &&
            index.partialFilterExpression &&
            index.partialFilterExpression.status === 'pending'
        );
        assert.ok(pendingGuard, 'A unique partial index on { userId } for status "pending" must exist');

        const app = express();
        app.use(express.json());
        app.use('/api/withdrawals', withdrawalRoutes);
        app.use('/api/admin/withdrawals', requireAdmin, withdrawalRoutes);
        server = http.createServer(app);
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

        const makeUser = async (suffix, balance, points) => {
            const user = await User.create({
                name: 'Withdrawal integration user',
                email: `withdrawal-${crypto.randomUUID()}-${suffix}@example.test`,
                passwordHash: 'integration-test-only',
                balance,
                points
            });
            createdUserIds.push(user._id);
            const token = jwt.sign({ userId: user._id.toString(), email: user.email }, testSecret, { expiresIn: '5m' });
            return { user, token };
        };
        const userSend = (path, { token, method = 'GET', body } = {}) => {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            if (body !== undefined) headers['Content-Type'] = 'application/json';
            return fetch(`${baseUrl}${path}`, {
                method,
                headers,
                body: body === undefined ? undefined : JSON.stringify(body)
            });
        };

        const admin = await Admin.create({
            email: `withdrawal-admin-${crypto.randomUUID()}-${crypto.randomUUID()}@example.test`,
            passwordHash: 'integration-test-only'
        });
        createdAdminIds.push(admin._id);
        const adminToken = jwt.sign(
            { sub: admin._id.toString(), sessionVersion: admin.sessionVersion },
            testAdminSecret,
            { issuer: 'taskbit-backend', audience: 'taskbit-admin', expiresIn: '5m' }
        );
        const adminHeaders = {
            'Content-Type': 'application/json',
            Origin: 'http://localhost:3001',
            Cookie: `${COOKIE_NAME}=${encodeURIComponent(adminToken)}`
        };
        const adminStatus = (id, status) => fetch(`${baseUrl}/admin/withdrawals/${id}/status`, {
            method: 'PUT',
            headers: adminHeaders,
            body: JSON.stringify({ status })
        });

        const withdrawalBody = { amount: 10, method: 'UPI' };
        // Unauthenticated request is rejected.
        const unauthenticated = await userSend('/withdrawals', { method: 'POST', body: withdrawalBody });
        assert.equal(unauthenticated.status, 401);

        // A user with insufficient balance is rejected.
        const poor = await makeUser('poor', 5, 50);
        const insufficient = await userSend('/withdrawals', { token: poor.token, method: 'POST', body: withdrawalBody });
        assert.equal(insufficient.status, 400);

        // Below the minimum ladder (₹5 = 50 coins < 100) is rejected with the
        // required minimum before any balance check.
        const belowMinimum = await userSend('/withdrawals', { token: poor.token, method: 'POST', body: { amount: 5, method: 'UPI' } });
        assert.equal(belowMinimum.status, 400);
        assert.equal((await belowMinimum.json()).minimumCoins, 100);

        // Concurrent duplicate submissions: exactly one succeeds, the rest are 409.
        const concurrent = await makeUser('concurrent', 100, 1000);
        const concurrentResults = await Promise.all(
            Array.from({ length: 5 }, () => userSend('/withdrawals', { token: concurrent.token, method: 'POST', body: withdrawalBody }))
        );
        assert.deepEqual(concurrentResults.map(r => r.status).sort(), [201, 409, 409, 409, 409]);
        assert.equal(await Withdrawal.countDocuments({ userId: concurrent.user._id }), 1, 'Only one pending withdrawal may exist');
        assert.equal((await User.findById(concurrent.user._id)).balance, 100, 'Creation must not deduct balance');

        // A repeated (sequential) submission after one pending exists is rejected.
        const sequentialDuplicate = await userSend('/withdrawals', { token: concurrent.token, method: 'POST', body: withdrawalBody });
        assert.equal(sequentialDuplicate.status, 409);

        // Approve the single pending request: balance deducted exactly once.
        const pending = await Withdrawal.findOne({ userId: concurrent.user._id });
        const approve = await adminStatus(pending._id, 'approved');
        assert.equal(approve.status, 200);
        let refreshed = await User.findById(concurrent.user._id);
        assert.equal(refreshed.balance, 90, 'Approval deducts the balance exactly once');
        assert.equal(refreshed.points, 900, 'Approval deducts the coins exactly once (100 coins for Rs.10)');
        assert.equal(refreshed.totalWithdrawn, 10);

        // Re-approving the same request must NOT deduct again (idempotent).
        const reApprove = await adminStatus(pending._id, 'approved');
        assert.equal(reApprove.status, 200);
        refreshed = await User.findById(concurrent.user._id);
        assert.equal(refreshed.balance, 90, 'Re-approval must not double-deduct the balance');
        assert.equal(refreshed.points, 900, 'Re-approval must not double-deduct coins');
        assert.equal(refreshed.totalWithdrawn, 10);

        // A user without enough coins cannot request even if the rupees are there.
        const fewCoins = await makeUser('fewcoins', 100, 50);
        const notEnoughCoins = await userSend('/withdrawals', { token: fewCoins.token, method: 'POST', body: withdrawalBody });
        assert.equal(notEnoughCoins.status, 400);
        assert.match((await notEnoughCoins.json()).error, /coins/i);

        // With no pending request left, a legitimate future withdrawal is allowed.
        // The ladder grew after the approval: ₹10 (100 coins) is now below the
        // 150-coin minimum and must be rejected; ₹15 (150 coins) is accepted.
        const belowLadder = await userSend('/withdrawals', { token: concurrent.token, method: 'POST', body: withdrawalBody });
        assert.equal(belowLadder.status, 400);
        assert.equal((await belowLadder.json()).minimumCoins, 150);
        const future = await userSend('/withdrawals', { token: concurrent.token, method: 'POST', body: { amount: 15, method: 'UPI' } });
        assert.equal(future.status, 201, 'A new withdrawal must be possible once the previous one is resolved');

        // Rejection does not deduct and frees the user to request again.
        const rejectedUser = await makeUser('rejected', 10, 100);
        const firstPending = await userSend('/withdrawals', { token: rejectedUser.token, method: 'POST', body: withdrawalBody });
        assert.equal(firstPending.status, 201);
        const rejectedId = (await firstPending.json())._id;
        const reject = await adminStatus(rejectedId, 'rejected');
        assert.equal(reject.status, 200);
        refreshed = await User.findById(rejectedUser.user._id);
        assert.equal(refreshed.balance, 10, 'Rejection must not deduct the balance');
        const afterReject = await userSend('/withdrawals', { token: rejectedUser.token, method: 'POST', body: withdrawalBody });
        assert.equal(afterReject.status, 201, 'A rejected request must free the user to withdraw again');
    } finally {
        if (server) await new Promise(resolve => server.close(resolve));
        if (mongoose.connection.readyState === 1) {
            await Withdrawal.deleteMany({ userId: { $in: createdUserIds } });
            if (createdUserIds.length) await User.deleteMany({ _id: { $in: createdUserIds } });
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

