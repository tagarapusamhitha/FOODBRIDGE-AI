const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const authController = require('../controllers/authController');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token - JWT_SECRET is required in production
            if (!process.env.JWT_SECRET) {
                console.error('SECURITY ERROR: JWT_SECRET environment variable is not configured');
                return res.status(500).json({ error: 'Server configuration error' });
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Attach user based on DB connection state
            if (mongoose.connection.readyState === 1) {
                req.user = await User.findById(decoded.id).select('-password');
            } else {
                const mockUser = authController.findMockUserById(decoded.id);
                if (mockUser) {
                    const { password, ...safeUser } = mockUser;
                    req.user = { id: mockUser._id, ...safeUser };
                }
            }
            
            if (!req.user) {
                return res.status(401).json({ error: 'User not found. Authorization denied.' });
            }

            next();
        } catch (error) {
            console.error('JWT Token Verification Error:', error.message);
            res.status(401).json({ error: 'Not authorized, token invalid' });
        }
    }

    if (!token) {
        return res.status(401).json({ error: 'Not authorized, no token provided' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        // Support role verification from either full mongoose objects or standby js objects
        const userRole = req.user && (req.user.role || (req.user._doc && req.user._doc.role));
        if (!req.user || !roles.includes(userRole)) {
            return res.status(403).json({
                error: `User role '${userRole || 'None'}' is not authorized to access this resource`
            });
        }
        next();
    };
};

module.exports = { protect, authorize };
