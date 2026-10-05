const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_COMMIT = '78a2ac7';
const TASK_DETAIL_PATH = 'app/src/main/java/com/example/taskbit/TaskDetailActivity.kt';
const TASK_ADAPTER_PATH = 'app/src/main/java/com/example/taskbit/TaskAdapter.kt';
const MANIFEST_PATH = path.join(__dirname, '..', 'reports', 'task-reconciliation-dry-run.json');
const TASK_COLLECTION = 'tasks';

function readGitFile(filePath) {
    return execFileSync('git', ['show', `${SOURCE_COMMIT}:${filePath}`], {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
    });
}

function getSourceTasks() {
    const detailSource = readGitFile(TASK_DETAIL_PATH);
    const adapterSource = readGitFile(TASK_ADAPTER_PATH);
    const titleMatch = adapterSource.match(/holder\.titleTextView\.text\s*=\s*"([^"]*\$taskNum[^"]*)"/);
    if (!titleMatch) throw new Error('Could not read the committed task title template');

    const titleTemplate = titleMatch[1];
    const tasks = [];
    const urlPattern = /"(https?:\/\/[^"\s]+)"\s*,?\s*\/\/\s*Task\s*(\d+)\b/g;
    for (const match of detailSource.matchAll(urlPattern)) {
        const number = Number(match[2]);
        tasks.push({
            taskNumber: number,
            title: titleTemplate.replace('$taskNum', String(number)),
            youtubeUrl: match[1]
        });
    }

    tasks.sort((left, right) => left.taskNumber - right.taskNumber);
    if (tasks.length !== 50 || tasks.some((task, index) => task.taskNumber !== index + 1)) {
        throw new Error('Committed source does not contain exactly one task URL for each number 1–50');
    }
    return tasks;
}

function dbNameFromUri(uri) {
    const pathname = new URL(uri).pathname.replace(/^\/+|\/+$/g, '');
    return decodeURIComponent(pathname) || 'taskbit';
}

function sourceNumberForRecord(record) {
    const numbers = new Set();
    for (const field of ['taskNumber', 'taskNo', 'taskIndex', 'number']) {
        const value = record[field];
        if (Number.isInteger(value)) numbers.add(value);
        else if (typeof value === 'string' && /^\d+$/.test(value.trim())) numbers.add(Number(value));
    }
    if (typeof record.title === 'string') {
        const titleNumber = record.title.match(/^Task\s*#?\s*(\d+)\b/i);
        if (titleNumber) numbers.add(Number(titleNumber[1]));
    }
    return numbers;
}

function reconcile(sourceTasks, currentRecords) {
    const sourceByUrl = new Map();
    for (const task of sourceTasks) {
        const tasks = sourceByUrl.get(task.youtubeUrl) || [];
        tasks.push(task.taskNumber);
        sourceByUrl.set(task.youtubeUrl, tasks);
    }

    const recordAnalyses = currentRecords.map(record => {
        const exactTitleTasks = sourceTasks
            .filter(task => task.title === record.title)
            .map(task => task.taskNumber);
        const numberTasks = sourceNumberForRecord(record);
        const numberSignals = new Set([...exactTitleTasks, ...numberTasks]);
        const urlTasks = new Set();
        if (typeof record.youtubeUrl === 'string') {
            for (const number of sourceByUrl.get(record.youtubeUrl) || []) urlTasks.add(number);
        }
        if (typeof record.title === 'string') {
            for (const number of sourceByUrl.get(record.title) || []) urlTasks.add(number);
        }
        let candidateTaskNumbers = new Set();
        let state = 'extra';
        let matchBasis = [];
        let ambiguityReason = null;

        if (numberSignals.size > 1) {
            state = 'ambiguous';
            candidateTaskNumbers = new Set([...numberSignals, ...urlTasks]);
            ambiguityReason = 'Current task title/number fields disagree';
        } else if (numberSignals.size === 1) {
            const number = [...numberSignals][0];
            const inSourceRange = sourceTasks.some(task => task.taskNumber === number);
            if (!inSourceRange) {
                state = 'extra';
            } else if (urlTasks.size > 0 && !urlTasks.has(number)) {
                state = 'ambiguous';
                candidateTaskNumbers = new Set([number, ...urlTasks]);
                ambiguityReason = 'Task number/title points to one source row, but the exact URL points to another';
            } else {
                state = 'matched';
                candidateTaskNumbers.add(number);
                if (exactTitleTasks.includes(number)) matchBasis.push('exact title');
                if (numberTasks.has(number)) matchBasis.push('task number');
                if (urlTasks.has(number)) matchBasis.push('exact URL');
            }
        } else if (urlTasks.size === 1) {
            const number = [...urlTasks][0];
            state = 'matched';
            candidateTaskNumbers.add(number);
            matchBasis.push('exact URL');
        } else if (urlTasks.size > 1) {
            state = 'ambiguous';
            candidateTaskNumbers = urlTasks;
            ambiguityReason = 'Exact URL is shared by multiple source task numbers; current record has no disambiguating task number/title';
        }

        return { record, state, candidateTaskNumbers, matchBasis, ambiguityReason };
    });

    const rows = sourceTasks.map(task => {
        const definiteRecords = recordAnalyses.filter(item =>
            item.state === 'matched' && item.candidateTaskNumbers.has(task.taskNumber));
        const ambiguousRecords = recordAnalyses.filter(item =>
            item.state === 'ambiguous' && item.candidateTaskNumbers.has(task.taskNumber));
        let classification;
        if (definiteRecords.length === 1 && ambiguousRecords.length === 0) classification = 'MATCH';
        else if (definiteRecords.length === 0 && ambiguousRecords.length === 0) classification = 'MISSING';
        else classification = 'AMBIGUOUS';

        const matched = classification === 'MATCH' ? definiteRecords[0] : null;
        const possibleRecords = [...definiteRecords, ...ambiguousRecords];
        return {
            sourceTaskNumber: task.taskNumber,
            sourceTitle: task.title,
            sourceYouTubeUrl: task.youtubeUrl,
            classification,
            matchBasis: matched?.matchBasis || [],
            currentMongoId: matched ? matched.record._id.toString() : null,
            currentStatus: matched && Object.hasOwn(matched.record, 'status') ? matched.record.status : null,
            candidateMongoIds: classification === 'AMBIGUOUS'
                ? possibleRecords.map(item => item.record._id.toString())
                : [],
            ambiguityReasons: ambiguousRecords.map(item => item.ambiguityReason)
        };
    });

    const extras = recordAnalyses.filter(item => item.state === 'extra').map(({ record }) => ({
        classification: 'EXTRA_CURRENT_RECORD',
        currentMongoId: record._id.toString(),
        currentTitle: record.title ?? null,
        currentYouTubeUrl: record.youtubeUrl ?? null,
        currentStatus: Object.hasOwn(record, 'status') ? record.status : null,
        reason: 'No exact source title, source task number, or exact source YouTube URL matched this record'
    }));
    const ambiguousCurrentRecords = recordAnalyses.filter(item => item.state === 'ambiguous').map(item => ({
        currentMongoId: item.record._id.toString(),
        currentTitle: item.record.title ?? null,
        currentYouTubeUrl: item.record.youtubeUrl ?? null,
        currentStatus: Object.hasOwn(item.record, 'status') ? item.record.status : null,
        candidateSourceTaskNumbers: [...item.candidateTaskNumbers].sort((a, b) => a - b),
        reason: item.ambiguityReason
    }));

    return { rows, extras, ambiguousCurrentRecords };
}

async function main() {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/taskbit';
    const databaseName = dbNameFromUri(uri);
    if (databaseName !== 'taskbit') {
        throw new Error('Configured MongoDB database is not taskbit; refusing to inspect a different database');
    }

    const sourceTasks = getSourceTasks();
    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        autoIndex: false,
        autoCreate: false,
        readPreference: 'primaryPreferred'
    });

    try {
        const collection = mongoose.connection.db.collection(TASK_COLLECTION);
        const countBefore = await collection.countDocuments({});
        const currentRecords = await collection.find({}, {
            projection: {
                _id: 1,
                title: 1,
                youtubeUrl: 1,
                status: 1,
                taskNumber: 1,
                taskNo: 1,
                taskIndex: 1,
                number: 1
            }
        }).toArray();
        const countAfter = await collection.countDocuments({});
        const { rows, extras, ambiguousCurrentRecords } = reconcile(sourceTasks, currentRecords);
        const summary = {
            MATCH: rows.filter(row => row.classification === 'MATCH').length,
            MISSING: rows.filter(row => row.classification === 'MISSING').length,
            AMBIGUOUS: rows.filter(row => row.classification === 'AMBIGUOUS').length,
            EXTRA_CURRENT_RECORD: extras.length
        };
        const repeatedUrlTaskNumbers = [...new Map(sourceTasks.map(task => [task.youtubeUrl, []])).keys()]
            .map(url => ({ url, taskNumbers: sourceTasks.filter(task => task.youtubeUrl === url).map(task => task.taskNumber) }))
            .filter(group => group.taskNumbers.length > 1);

        const report = {
            reportType: 'READ_ONLY_TASK_RECONCILIATION',
            sourceCommit: SOURCE_COMMIT,
            sourceFiles: { taskUrls: TASK_DETAIL_PATH, taskTitles: TASK_ADAPTER_PATH },
            databaseName,
            collection: TASK_COLLECTION,
            readOnly: true,
            mongoWriteOperationsIssued: 0,
            taskRecordCountBefore: countBefore,
            taskRecordCountAfter: countAfter,
            countUnchangedDuringRead: countBefore === countAfter,
            sourceTaskCount: sourceTasks.length,
            repeatedSourceUrls: repeatedUrlTaskNumbers,
            summary,
            sourceTaskRows: rows,
            extraCurrentRecords: extras,
            ambiguousCurrentRecords
        };

        fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
        fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
        console.log(JSON.stringify({
            manifestPath: path.relative(PROJECT_ROOT, MANIFEST_PATH),
            databaseName,
            taskRecordCountBefore: countBefore,
            taskRecordCountAfter: countAfter,
            countUnchangedDuringRead: report.countUnchangedDuringRead,
            summary,
            repeatedSourceUrls: repeatedUrlTaskNumbers.map(group => ({ taskNumbers: group.taskNumbers })),
            first10Rows: rows.slice(0, 10),
            extraCurrentRecords: extras,
            ambiguousCurrentRecords
        }, null, 2));
        if (!report.countUnchangedDuringRead) process.exitCode = 2;
    } finally {
        await mongoose.disconnect();
    }
}

main().catch(() => {
    console.error('Read-only task reconciliation failed; connection details were suppressed.');
    process.exitCode = 1;
});
