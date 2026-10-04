const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

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

// --- Mount API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bank-details', bankRoutes);
app.use('/api/withdrawals', withdrawalRoutes);

// Health Check
app.get('/', (req, res) => {
    res.json({ message: 'TaskBit Secure MERN Backend Server is running successfully!' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
