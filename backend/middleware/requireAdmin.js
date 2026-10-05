const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const COOKIE_NAME = 'taskbit_admin_session';

function readCookie(req, name) {
    const rawCookie = req.headers.cookie || '';
    const item = rawCookie.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`));
    if (!item) return null;
    try {
        return decodeURIComponent(item.slice(name.length + 1));
    } catch {
        return null;
    }
}

function isAllowedOrigin(origin) {
    if (!origin) return false;
    const configured = (process.env.ADMIN_PANEL_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean);
    if (process.env.NODE_ENV !== 'production') {
        configured.push('http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173');
    }
    return configured.includes(origin);
}

async function requireAdmin(req, res, next) {
    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret || secret.length < 32) {
        return res.status(503).json({ error: 'Admin authentication is not configured' });
    }

    try {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !isAllowedOrigin(req.get('origin'))) {
            return res.status(403).json({ error: 'Request origin is not allowed' });
        }

        const token = readCookie(req, COOKIE_NAME);
        if (!token) return res.status(401).json({ error: 'Admin authentication required' });

        const payload = jwt.verify(token, secret, {
            issuer: 'taskbit-backend',
            audience: 'taskbit-admin'
        });
        const admin = await Admin.findById(payload.sub);
        if (!admin || payload.sessionVersion !== admin.sessionVersion) {
            return res.status(401).json({ error: 'Admin session is no longer valid' });
        }

        req.admin = admin;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Admin session is invalid or expired' });
    }
}

module.exports = { requireAdmin, COOKIE_NAME, isAllowedOrigin };
