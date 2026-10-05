const path = require('node:path');
const { execFileSync } = require('node:child_process');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_COMMIT = '78a2ac7';
const TASK_DETAIL_PATH = 'app/src/main/java/com/example/taskbit/TaskDetailActivity.kt';
const TASK_ADAPTER_PATH = 'app/src/main/java/com/example/taskbit/TaskAdapter.kt';
const TASK_COLLECTION = 'tasks';
const EXPECTED_LEGACY_COUNT = 5;

class PreflightError extends Error {}

function readGitFile(filePath) {
    try {
        return execFileSync('git', ['show', `${SOURCE_COMMIT}:${filePath}`], {
            cwd: PROJECT_ROOT,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        });
    } catch {
        throw new PreflightError(`Source commit ${SOURCE_COMMIT} is unavailable for ${filePath}`);
    }
}

function readOriginalTasks() {
    const urlsSource = readGitFile(TASK_DETAIL_PATH);
    const adapterSource = readGitFile(TASK_ADAPTER_PATH);
    const titleMatch = adapterSource.match(/holder\.titleTextView\.text\s*=\s*"([^"]*\$taskNum[^"]*)"/);
    if (!titleMatch || titleMatch[1] !== 'Task #$taskNum. Watch Task - Start') {
        throw new PreflightError('Committed TaskAdapter title template does not match the approved original title');
    }

    const tasks = [];
    const urlPattern = /"(https?:\/\/[^"\s]+)"\s*,?\s*\/\/\s*Task\s*(\d+)\b/g;
    for (const match of urlsSource.matchAll(urlPattern)) {
        tasks.push({
            taskNumber: Number(match[2]),
            title: titleMatch[1].replace('$taskNum', match[2]),
            youtubeUrl: match[1]
        });
    }
    tasks.sort((left, right) => left.taskNumber - right.taskNumber);
    if (tasks.length !== 50 || tasks.some((task, index) => task.taskNumber !== index + 1)) {
        throw new PreflightError('Committed source must contain exactly one original URL for each task number 1–50');
    }
    return tasks;
}

function getDatabaseName(uri) {
    let pathname;
    try {
        pathname = new URL(uri).pathname.replace(/^\/+|\/+$/g, '');
    } catch {
        throw new PreflightError('Configured MongoDB URI is invalid');
    }
    return decodeURIComponent(pathname) || 'taskbit';
}

function exactTitleNumbers(record, sourceTasks) {
    return sourceTasks.filter(task => record.title === task.title).map(task => task.taskNumber);
}

function sourceUrlCandidates(record, sourceTasks) {
    const urls = new Set();
    if (typeof record.youtubeUrl === 'string' && record.youtubeUrl.trim()) urls.add(record.youtubeUrl);
    // Treat a URL stored in the title as a clue during preflight, never as a silent match.
    if (typeof record.title === 'string' && /^https?:\/\//i.test(record.title)) urls.add(record.title);
    return sourceTasks.filter(task => urls.has(task.youtubeUrl));
}

function inspectExistingTasks(records, sourceTasks) {
    if (records.length < EXPECTED_LEGACY_COUNT) {
        throw new PreflightError(`Expected at least ${EXPECTED_LEGACY_COUNT} legacy records, found ${records.length} total task records`);
    }

    const legacyRecords = records.filter(record => record.taskNumber === undefined || record.taskNumber === null);
    const numberedRecords = records.filter(record => record.taskNumber !== undefined && record.taskNumber !== null);
    if (legacyRecords.length !== EXPECTED_LEGACY_COUNT) {
        throw new PreflightError(`Expected exactly ${EXPECTED_LEGACY_COUNT} unnumbered legacy records; found ${legacyRecords.length}`);
    }

    const sourceByNumber = new Map(sourceTasks.map(task => [task.taskNumber, task]));
    const seenNumbers = new Set();
    for (const record of numberedRecords) {
        const number = record.taskNumber;
        if (!Number.isInteger(number) || number < 1 || number > 50) {
            throw new PreflightError(`Existing task ${record._id} has invalid taskNumber; no documents were changed`);
        }
        if (seenNumbers.has(number)) {
            throw new PreflightError(`Existing tasks contain duplicate taskNumber ${number}; no documents were changed`);
        }
        seenNumbers.add(number);

        const source = sourceByNumber.get(number);
        if (record.title !== source.title || record.youtubeUrl !== source.youtubeUrl || record.status !== 'Active') {
            throw new PreflightError(`Existing taskNumber ${number} does not exactly match its approved title, URL, and Active status; no documents were changed`);
        }
    }

    const legacyConflicts = [];
    for (const record of legacyRecords) {
        const titleCandidates = exactTitleNumbers(record, sourceTasks);
        const urlCandidates = sourceUrlCandidates(record, sourceTasks);
        if (titleCandidates.length || urlCandidates.length) {
            legacyConflicts.push({
                id: record._id.toString(),
                taskNumbers: [...new Set([...titleCandidates, ...urlCandidates.map(task => task.taskNumber)])]
            });
        }
    }
    if (legacyConflicts.length) {
        const conflicts = legacyConflicts.map(item => `${item.id}→${item.taskNumbers.join(',')}`).join('; ');
        throw new PreflightError(`Unnumbered legacy records resemble original tasks (${conflicts}); manual review required before any write`);
    }

    const missingTasks = sourceTasks.filter(task => !seenNumbers.has(task.taskNumber));
    return { legacyRecords, numberedRecords, missingTasks };
}

async function ensureTaskNumberIndex(collection) {
    const indexes = await collection.indexes();
    const existing = indexes.find(index => index.key?.taskNumber === 1 && Object.keys(index.key).length === 1);
    if (existing) {
        const partial = existing.partialFilterExpression?.taskNumber;
        if (existing.unique === true && partial?.$type === 'number') return;
        throw new PreflightError('An incompatible taskNumber index exists; no task documents were changed');
    }
    await collection.createIndex(
        { taskNumber: 1 },
        { unique: true, partialFilterExpression: { taskNumber: { $type: 'number' } } }
    );
}

async function main() {
    const args = process.argv.slice(2);
    if (args.some(arg => !['--apply', '--dry-run'].includes(arg)) || args.includes('--apply') && args.includes('--dry-run')) {
        throw new PreflightError('Use no arguments for dry-run or pass only --apply to seed');
    }
    const apply = args.includes('--apply');
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/taskbit';
    if (getDatabaseName(uri) !== 'taskbit') {
        throw new PreflightError('Configured MongoDB database is not taskbit; refusing to continue');
    }
    const sourceTasks = readOriginalTasks();

    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        autoIndex: false,
        autoCreate: false
    });
    try {
        const collection = mongoose.connection.db.collection(TASK_COLLECTION);
        const taskRecordCountBefore = await collection.countDocuments({});
        const records = await collection.find({}, {
            projection: { _id: 1, taskNumber: 1, title: 1, youtubeUrl: 1, status: 1 }
        }).toArray();
        if (records.length !== taskRecordCountBefore) {
            throw new PreflightError('Task collection changed during preflight; no documents were changed');
        }

        const { legacyRecords, numberedRecords, missingTasks } = inspectExistingTasks(records, sourceTasks);
        const plan = {
            mode: apply ? 'APPLY' : 'DRY-RUN',
            databaseName: 'taskbit',
            sourceCommit: SOURCE_COMMIT,
            sourceTaskCount: sourceTasks.length,
            taskRecordCountBefore,
            existingNumberedTasks: numberedRecords.length,
            existingLegacyTasksPreserved: legacyRecords.length,
            missingTaskNumbers: missingTasks.map(task => task.taskNumber),
            documentsToInsert: missingTasks.length,
            documentsToUpdate: 0,
            documentsToDelete: 0,
            documentsToReplace: 0,
            expectedTaskRecordCountAfter: taskRecordCountBefore + missingTasks.length
        };
        console.log(JSON.stringify(plan, null, 2));
        if (!apply) return;

        await ensureTaskNumberIndex(collection);
        for (const task of missingTasks) {
            await collection.insertOne({
                taskNumber: task.taskNumber,
                title: task.title,
                youtubeUrl: task.youtubeUrl,
                status: 'Active',
                description: '',
                completed: false,
                userId: '',
                points: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        const taskRecordCountAfter = await collection.countDocuments({});
        const numbered = await collection.find({ taskNumber: { $gte: 1, $lte: 50 } }, {
            projection: { _id: 1, taskNumber: 1, title: 1, youtubeUrl: 1, status: 1 }
        }).toArray();
        const numbers = numbered.map(task => task.taskNumber).sort((left, right) => left - right);
        const exactSourceMatches = sourceTasks.every(source => {
            const matches = numbered.filter(task => task.taskNumber === source.taskNumber);
            return matches.length === 1
                && matches[0].title === source.title
                && matches[0].youtubeUrl === source.youtubeUrl
                && matches[0].status === 'Active';
        });
        const legacyCountAfter = await collection.countDocuments({ taskNumber: { $exists: false } });
        const nullTaskNumberCount = await collection.countDocuments({ taskNumber: { $type: 10 } });
        const result = {
            mode: 'APPLY',
            inserted: missingTasks.length,
            taskRecordCountAfter,
            numberedTaskCount: numbered.length,
            taskNumbersExactly1To50: numbers.length === 50 && numbers.every((number, index) => number === index + 1),
            duplicateTaskNumberCount: numbered.length - new Set(numbers).size,
            exactSourceMatches,
            activeNumberedTaskCount: numbered.filter(task => task.status === 'Active' && typeof task.youtubeUrl === 'string' && task.youtubeUrl.trim()).length,
            unnumberedLegacyCount: legacyCountAfter + nullTaskNumberCount,
            legacyCountAfter,
            nullTaskNumberCount
        };
        console.log(JSON.stringify(result, null, 2));
        if (taskRecordCountAfter !== 55 || numbered.length !== 50 || !result.taskNumbersExactly1To50
            || result.duplicateTaskNumberCount !== 0 || !exactSourceMatches
            || result.activeNumberedTaskCount !== 50 || result.unnumberedLegacyCount !== EXPECTED_LEGACY_COUNT) {
            throw new Error('Post-seed verification failed; no existing documents were deleted or replaced');
        }
    } finally {
        await mongoose.disconnect();
    }
}

main().catch(error => {
    if (error instanceof PreflightError) console.error(`Seed preflight stopped: ${error.message}`);
    else console.error('Seed command failed; connection details were suppressed. Any completed inserts are idempotent and can be verified with a dry-run.');
    process.exitCode = 1;
});
