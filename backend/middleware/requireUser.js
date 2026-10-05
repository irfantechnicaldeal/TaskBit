const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

async function requireUser(req, res, next) {
    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) {
        return res.status(401).json({ error: 'User authentication required' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        return res.status(503).json({ error: 'User authentication is not configured' });
    }

    let payload;
    try {
        payload = jwt.verify(match[1].trim(), secret, { algorithms: ['HS256'] });
    } catch (_err) {
        return res.status(401).json({ error: 'User authentication token is invalid or expired' });
    }

    if (!payload || typeof payload !== 'object' || typeof payload.userId !== 'string' ||
        !mongoose.isValidObjectId(payload.userId)) {
        return res.status(401).json({ error: 'User authentication token is invalid' });
    }

    try {
        const user = await User.findById(payload.userId);
        if (!user) {
            return res.status(401).json({ error: 'Authenticated user no longer exists' });
        }
        req.user = user;
        return next();
    } catch (_err) {
        return res.status(500).json({ error: 'Unable to verify authenticated user' });
    }
}

module.exports = { requireUser };
