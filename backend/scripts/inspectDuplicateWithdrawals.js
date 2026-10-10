// Inspect (and optionally clean up) duplicate PENDING withdrawal requests.
//
// A user should have at most one pending withdrawal. This script detects users
// who currently have more than one pending request (a genuine duplicate caused by
// the pre-fix bug) and reports exactly what would change.
//
// Usage:
//   node scripts/inspectDuplicateWithdrawals.js            # read-only preview (default)
//   node scripts/inspectDuplicateWithdrawals.js --apply     # backup, then REJECT duplicate pending extras
//   node scripts/inspectDuplicateWithdrawals.js --apply --force-live
//                                                          # allow --apply on a non-"test" database
//
// Safety:
//   - Preview mode performs NO writes.
//   - --apply always writes a timestamped JSON backup to backend/backups/ FIRST.
//   - --apply NEVER deletes financial records. Duplicate pending extras are marked
//     'rejected' (the earliest pending request per user+amount is KEPT), which both
//     preserves history and lets the unique partial index build cleanly.
//   - --apply refuses to run against a live (non-"test") database unless --force-live.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');

const APPLY = process.argv.includes('--apply');
const FORCE_LIVE = process.argv.includes('--force-live');

async function main() {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/taskbit';
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const dbName = mongoose.connection.db.databaseName;
    const isTestDb = /test/i.test(dbName);

    console.log(`Connected to database: ${dbName}`);
    console.log(`Mode: ${APPLY ? 'APPLY (will write backup + reject duplicate pending extras)' : 'PREVIEW (read-only, no changes)'}`);

    // Group pending withdrawals by user + amount; a group with >1 row is a duplicate set.
    const duplicateGroups = await Withdrawal.aggregate([
        { $match: { status: 'pending' } },
        { $group: {
            _id: { userId: '$userId', amount: '$amount' },
            count: { $sum: 1 },
            docs: { $push: { _id: '$_id', createdAt: '$createdAt', method: '$method' } }
        } },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1 } }
    ]);

    if (duplicateGroups.length === 0) {
        console.log('No duplicate pending withdrawals found. Nothing to do.');
        await mongoose.disconnect();
        return;
    }

    let totalDuplicates = 0;
    const duplicateIdsToReject = [];
    const backupRecords = [];

    for (const group of duplicateGroups) {
        const user = await User.findById(group._id.userId).select('name email').lean();
        const userLabel = user ? `${user.name} <${user.email}>` : `MISSING USER (${group._id.userId})`;
        // Oldest pending request is kept; the rest are duplicates.
        const sorted = group.docs.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const [keep, ...dupes] = sorted;

        console.log('\n----------------------------------------');
        console.log(`User: ${userLabel}`);
        console.log(`Pending requests with amount ₹${group._id.amount}: ${group.count}`);
        console.log(`  KEEP (earliest): ${keep._id}  created ${new Date(keep.createdAt).toISOString()}`);
        for (const dupe of dupes) {
            console.log(`  DUPLICATE -> would mark rejected: ${dupe._id}  created ${new Date(dupe.createdAt).toISOString()}`);
            duplicateIdsToReject.push(dupe._id);
            totalDuplicates += 1;
        }
        for (const doc of sorted) {
            backupRecords.push({
                _id: doc._id,
                userId: group._id.userId,
                amount: group._id.amount,
                method: doc.method,
                createdAt: doc.createdAt,
                action: doc._id.equals(keep._id) ? 'keep' : 'reject-duplicate'
            });
        }
    }

    console.log('\n========================================');
    console.log(`Summary: ${duplicateGroups.length} user(s) with duplicates, ${totalDuplicates} duplicate pending request(s) would be marked rejected.`);

    if (!APPLY) {
        console.log('PREVIEW only. Re-run with --apply to write a backup and mark duplicates rejected.');
        await mongoose.disconnect();
        return;
    }

    if (!isTestDb && !FORCE_LIVE) {
        console.error(`Refusing to --apply on non-test database "${dbName}". Re-run with --force-live if you are sure.`);
        await mongoose.disconnect();
        process.exitCode = 1;
        return;
    }

    // 1) Backup first.
    const backupsDir = path.join(__dirname, '..', 'backups');
    fs.mkdirSync(backupsDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupsDir, `duplicate-withdrawals-${stamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify({ database: dbName, generatedAt: new Date().toISOString(), groups: backupRecords }, null, 2));
    console.log(`Backup written: ${backupPath}`);

    // 2) Mark duplicate pending extras as rejected (never delete).
    const note = 'Auto-cleanup: duplicate pending withdrawal request rejected (earliest request kept).';
    const result = await Withdrawal.updateMany(
        { _id: { $in: duplicateIdsToReject }, status: 'pending' },
        { $set: { status: 'rejected', adminNote: note, processedAt: new Date() } }
    );
    console.log(`Marked ${result.modifiedCount} duplicate pending request(s) as rejected. Financial records preserved.`);

    await mongoose.disconnect();
}

main().catch(async (err) => {
    console.error('INSPECT_ERROR:', err.message);
    try { await mongoose.disconnect(); } catch (_e) { /* ignore */ }
    process.exitCode = 1;
});
