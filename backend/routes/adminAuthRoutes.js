const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { requireAdmin, COOKIE_NAME } = require('../middleware/requireAdmin');

const router = express.Router();
const SESSION_MS = 8 * 60 * 60 * 1000;
const isProduction = process.env.NODE_ENV === 'production';
const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api/admin',
    maxAge: SESSION_MS
};

function createSession(admin) {
    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret || secret.length < 32) throw new Error('Admin authentication is not configured');

    return jwt.sign({ sub: admin._id.toString(), sessionVersion: admin.sessionVersion }, secret, {
        expiresIn: '8h',
        issuer: 'taskbit-backend',
        audience: 'taskbit-admin'
    });
}

router.post('/login', async (req, res) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const password = req.body.password;
        if (!email || typeof password !== 'string' || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const admin = await Admin.findOne({ email }).select('+passwordHash');
        const passwordMatches = admin && await bcrypt.compare(password, admin.passwordHash);
        if (!passwordMatches) return res.status(401).json({ error: 'Invalid email or password' });

        res.cookie(COOKIE_NAME, createSession(admin), cookieOptions);
        return res.json({ admin: { email: admin.email } });
    } catch (err) {
        if (err.message === 'Admin authentication is not configured') {
            return res.status(503).json({ error: err.message });
        }
        return res.status(500).json({ error: 'Unable to sign in' });
    }
});

router.post('/logout', (req, res) => {
    const { maxAge, ...clearOptions } = cookieOptions;
    res.clearCookie(COOKIE_NAME, clearOptions);
    res.status(204).end();
});

router.get('/session', requireAdmin, (req, res) => {
    res.json({ admin: { email: req.admin.email } });
});

router.post('/change-password', requireAdmin, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
            return res.status(400).json({ error: 'Current and new passwords are required' });
        }
        if (newPassword.length < 12) {
            return res.status(400).json({ error: 'New password must be at least 12 characters' });
        }

        const admin = await Admin.findById(req.admin._id).select('+passwordHash');
        if (!admin || !await bcrypt.compare(currentPassword, admin.passwordHash)) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        admin.passwordHash = await bcrypt.hash(newPassword, 12);
        admin.sessionVersion += 1;
        await admin.save();
        const { maxAge, ...clearOptions } = cookieOptions;
        res.clearCookie(COOKIE_NAME, clearOptions);
        return res.json({ message: 'Password changed. Sign in again with the new password.' });
    } catch (err) {
        return res.status(500).json({ error: 'Unable to change password' });
    }
});

module.exports = router;
