require('dotenv').config({
    path: require('path').join(__dirname, '.env')
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const app = express();

const PORT = process.env.PORT || 5000;

// Initialize database connection
const initializeDatabase = async () => {
    try {
        await connectDB();
        console.log('Database connection initialized');
    } catch (error) {
        console.error('Database initialization error:', error.message);
        // App continues in standby mode if database connection fails
    }
};

// Initialize DB on app startup (non-blocking)
initializeDatabase();

// Security middleware
app.use(cors());

app.use(helmet({
    contentSecurityPolicy: false
}));

app.use(express.json({
    limit: '10mb'
}));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 150,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests. Please try again in 15 minutes.'
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many login attempts. Please try again in 15 minutes.'
    }
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Static frontend
app.use(express.static(path.join(__dirname, '..')));

// Routes
const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donations');
const statsRoutes = require('./routes/stats');
const matchingRoutes = require('./routes/matching');
const mapRoutes = require('./routes/map');
const notificationRoutes = require('./routes/notifications');
const contactRoutes = require('./routes/contact');

app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/contact', contactRoutes);

app.get('/api/contact-test', (req, res) => {
    res.json({
        ok: true,
        msg: 'contact test route works'
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Express Error:', err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// Local development only
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;