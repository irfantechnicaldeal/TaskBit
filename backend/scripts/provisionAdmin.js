require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

async function provisionAdmin() {
    const { MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
    if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
        throw new Error('MONGO_URI, ADMIN_EMAIL, and ADMIN_PASSWORD must be set');
    }
    if (ADMIN_PASSWORD.length < 12) {
        throw new Error('ADMIN_PASSWORD must be at least 12 characters');
    }

    await mongoose.connect(MONGO_URI);
    const email = ADMIN_EMAIL.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await Admin.findOneAndUpdate(
        { email },
        { $set: { passwordHash }, $setOnInsert: { email }, $inc: { sessionVersion: 1 } },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    console.log('Admin account provisioned.');
}

provisionAdmin()
    .catch((err) => {
        console.error(`Admin provisioning failed: ${err.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
