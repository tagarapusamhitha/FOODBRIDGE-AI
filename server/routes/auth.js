const express = require('express');
const { body } = require('express-validator');
const { signup, login, getProfile, updateProfile, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Signup Route with validations
router.post(
    '/signup',
    [
        body('fullName', 'Full Name is required').notEmpty().trim(),
        body('email', 'Please enter a valid email address').isEmail().normalizeEmail(),
        body('password', 'Password must be at least 6 characters long').isLength({ min: 6 }),
        body('mobileNumber', 'Please enter a valid mobile number').notEmpty().trim(),
        body('role', 'Invalid user type').optional().isIn(['Donor', 'NGO', 'Admin']),
        // NGO-specific optional fields
        body('location', 'Location cannot be empty').optional().notEmpty().trim(),
        body('city', 'City cannot be empty').optional().notEmpty().trim(),
        body('state', 'State cannot be empty').optional().notEmpty().trim(),
        body('latitude', 'Invalid latitude').optional().isFloat({ min: -90, max: 90 }),
        body('longitude', 'Invalid longitude').optional().isFloat({ min: -180, max: 180 }),
        body('capacity', 'Invalid capacity').optional().isInt({ min: 1 }),
        body('preferences', 'Preferences cannot be empty').optional().notEmpty().trim()
    ],
    signup
);

// Login Route
router.post(
    '/login',
    (req, res, next) => {
        console.log('AUTH ROUTE LOGIN BODY', req.body);
        next();
    },
    [
        body('email', 'Please enter a valid email address').isEmail().normalizeEmail(),
        body('password', 'Password is required').notEmpty()
    ],
    login
);

// Profile Routing (Protected)
router.get('/profile', protect, getProfile);
router.put(
    '/profile',
    [
        protect,
        body('fullName', 'Full Name is required').optional().notEmpty().trim(),
        body('email', 'Please enter a valid email address').optional().isEmail().normalizeEmail(),
        body('mobileNumber', 'Mobile number cannot be empty').optional().notEmpty().trim()
    ],
    updateProfile
);

// Password Change Route (Protected)
router.put(
    '/password',
    [
        protect,
        body('currentPassword', 'Current password is required').notEmpty(),
        body('newPassword', 'New password must be at least 6 characters long').isLength({ min: 6 })
    ],
    changePassword
);

module.exports = router;
