const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
const allowedAdminOrigins = (process.env.ADMIN_PANEL_ORIGIN || '')
    .split(',').map(origin => origin.trim()).filter(Boolean);
if (process.env.NODE_ENV !== 'production') {
    allowedAdminOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173');
}
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedAdminOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true
}));

// Environment variables
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/taskbit';

// MongoDB Connection with fail-fast serverSelectionTimeoutMS
mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log('MongoDB Connected Successfully to TaskBit Database!'))
    .catch(err => {
        console.error('MongoDB Connection Error: Ensure MongoDB is installed and running locally or check MONGO_URI.');
        console.error(err.message);
    });

// --- Import Routes ---
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const userRoutes = require('./routes/userRoutes');
const bankRoutes = require('./routes/bankRoutes');
const withdrawalRoutes = require('./routes/withdrawalRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const { requireAdmin } = require('./middleware/requireAdmin');

// --- Mount API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
// Admin-only namespace reuses existing handlers; mobile-facing routes below remain available.
app.use('/api/admin/users', requireAdmin, userRoutes);
app.use('/api/admin/tasks', requireAdmin, taskRoutes);
app.use('/api/admin/bank-details', requireAdmin, bankRoutes);
app.use('/api/admin/withdrawals', requireAdmin, withdrawalRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bank-details', bankRoutes);
app.use('/api/withdrawals', withdrawalRoutes);

// Health Check
app.get('/', (req, res) => {
    res.json({ message: 'TaskBit Secure MERN Backend Server is running successfully!' });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
