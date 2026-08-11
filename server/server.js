require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

// Models for seeding
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect Database (fall back to standby mode if MongoDB is temporarily unavailable)
connectDB().catch(err => {
    console.error('MongoDB connection failed. Running in standby mode:', err.message);
});

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(cors());
app.use(helmet({
    contentSecurityPolicy: false // Allows loading Bootstrap, Leaflet, Chart.js, and Google Font CDNs
}));
app.use(express.json({ limit: '10mb' }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 150,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again in 15 minutes.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,   // Stricter limit for auth endpoints
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' }
});


// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);
// Extra-strict rate limiting for auth routes
app.use('/api/auth/', authLimiter);

// ─── Static Frontend Files ────────────────────────────────────────────────────
// Serve all frontend files from project root (parent directory of /server)
app.use(express.static(path.join(__dirname, '..')));

// ─── API Routes ───────────────────────────────────────────────────────────────
const authRoutes          = require('./routes/auth');
const donationRoutes      = require('./routes/donations');
const statsRoutes         = require('./routes/stats');
const matchingRoutes      = require('./routes/matching');
const mapRoutes           = require('./routes/map');
const notificationRoutes  = require('./routes/notifications');
const contactRoutes       = require('./routes/contact');

app.use('/api/auth',          authRoutes);
app.use('/api/donations',     donationRoutes);
app.use('/api/stats',         statsRoutes);
app.use('/api/matching',      matchingRoutes);
app.use('/api/map',           mapRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/contact',      contactRoutes);

// Temporary diagnostic route
app.get('/api/contact-test', (req, res) => res.json({ ok: true, msg: 'contact test route works' }));

// Debug: log registered routes
const _routes = [];
authRoutes.stack.concat(donationRoutes.stack, statsRoutes.stack, matchingRoutes.stack, mapRoutes.stack, notificationRoutes.stack, contactRoutes.stack).forEach(m => {
    const r = m.route || m;
    if (r.methods) {
        _routes.push(`${Object.keys(r.methods)[0].toUpperCase()} ${r.path}`);
    }
});
console.log('Registered routes:', _routes);
console.log('contactRoutes.stack:', JSON.stringify(contactRoutes.stack.map(m => ({ route: m.route ? { path: m.route.path, methods: Object.keys(m.route.methods) } : null }))));

// ─── Root Route ───────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Express Error:', err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// ─── Start Server (only in local dev, not in serverless/Vercel) ─────────────
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Export app for serverless (Vercel) compatibility
module.exports = app;