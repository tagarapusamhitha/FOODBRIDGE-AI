const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const isDBConnected = () => mongoose.connection.readyState === 1;

// Global in-memory storage for standby mode
let mockUsers = [
    {
        _id: 'mock-admin-id-12345',
        fullName: 'System Administrator',
        email: 'admin@zerowasteai.org',
        password: 'AdminPassword123!',
        mobileNumber: '9999999999',
        role: 'Admin',
        avatar: ''
    },
    {
        _id: 'mock-donor-id-54321',
        fullName: 'Test Donor',
        email: 'test@example.com',
        password: 'password123',
        mobileNumber: '9876543210',
        role: 'Donor',
        avatar: ''
    }
];

const passwordMatches = async (inputPassword, storedPassword) => {
    if (!storedPassword) return false;
    if (storedPassword.startsWith('$2')) {
        return bcrypt.compare(inputPassword, storedPassword);
    }
    return inputPassword === storedPassword;
};

// Helper to generate JWT
const generateToken = (id) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is not configured');
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });
};

// Expose mock database accessor for auth middleware in standby mode
exports.findMockUserById = (id) => {
    return mockUsers.find(u => u._id === id);
};

// Expose the full mock user list so other controllers (map, matching)
// can see newly registered NGOs in standby mode
exports.getMockUsersList = () => {
    return mockUsers;
};

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }

    const {
        fullName, email, password, mobileNumber, role,
        location, city, state, latitude, longitude, capacity, preferences
    } = req.body;

    // NGO additional fields (only persisted if role is NGO)
    const ngoFields = {
        ...(location ? { location } : {}),
        ...(city ? { city } : {}),
        ...(state ? { state } : {}),
        ...(latitude ? { latitude: parseFloat(latitude) } : {}),
        ...(longitude ? { longitude: parseFloat(longitude) } : {}),
        ...(capacity ? { capacity: parseInt(capacity) || 100 } : {}),
        ...(preferences ? { preferences } : {})
    };

    // --- DB MODE ---
    if (isDBConnected()) {
        try {
            let userExists = await User.findOne({ email });
            if (userExists) {
                return res.status(400).json({ error: 'User already exists with this email address' });
            }

            const user = await User.create({
                fullName,
                email,
                password,
                mobileNumber,
                role: role || 'Donor',
                ...ngoFields
            });

            return res.status(201).json({
                message: 'Signup successful! 🎉',
                token: generateToken(user._id),
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    mobileNumber: user.mobileNumber,
                    role: user.role,
                    avatar: user.avatar,
                    ...(user.role === 'NGO' ? {
                        location: user.location,
                        city: user.city,
                        state: user.state,
                        latitude: user.latitude,
                        longitude: user.longitude,
                        capacity: user.capacity,
                        preferences: user.preferences
                    } : {})
                }
            });
        } catch (err) {
            console.error('Signup Error:', err.message);
            return res.status(500).json({ error: 'Server error during signup' });
        }
    }

    // --- STANDBY IN-MEMORY MODE ---
    console.log('[STANDBY MODE] Processing signup in-memory');
    if (mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ error: 'User already exists with this email address' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = {
            _id: 'mock-user-' + Date.now(),
            fullName,
            email: email.toLowerCase(),
            password: hashedPassword,
            mobileNumber,
            role: role || 'Donor',
            avatar: '',
            ...ngoFields
        };

        mockUsers.push(newUser);

        res.status(201).json({
            message: 'Signup successful! (Standby Mode) 🎉',
            token: generateToken(newUser._id),
            user: {
                id: newUser._id,
                fullName: newUser.fullName,
                email: newUser.email,
                mobileNumber: newUser.mobileNumber,
                role: newUser.role,
                avatar: newUser.avatar
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Standby mode signup encryption failure' });
    }
};

// @desc    Authenticate user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    // --- DB MODE ---
    if (isDBConnected()) {
        try {
            const user = await User.findOne({ email });
            if (user && (await user.comparePassword(password))) {
                return res.json({
                    message: 'Login successful! Welcome back 🎉',
                    token: generateToken(user._id),
                    user: {
                        id: user._id,
                        fullName: user.fullName,
                        email: user.email,
                        mobileNumber: user.mobileNumber,
                        role: user.role,
                        avatar: user.avatar
                    }
                });
            } else {
                return res.status(400).json({ error: 'Invalid email or password' });
            }
        } catch (err) {
            console.error('Login Error:', err.message);
            return res.status(500).json({ error: 'Server error during login' });
        }
    }

    // --- STANDBY IN-MEMORY MODE ---
    console.log('[STANDBY MODE] Processing login in-memory');
    console.log('login request email', email);
    console.log('mock users', mockUsers.map(u => ({ email: u.email, role: u.role })));
    const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
        console.log('no matching mock user');
        return res.status(400).json({ error: 'Invalid email or password' });
    }

    try {
        const isMatch = await passwordMatches(password, user.password);
        console.log('password match result', isMatch);
        if (isMatch) {
            res.json({
                message: 'Login successful! Welcome back (Standby Mode) 🎉',
                token: generateToken(user._id),
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    mobileNumber: user.mobileNumber,
                    role: user.role,
                    avatar: user.avatar
                }
            });
        } else {
            res.status(400).json({ error: 'Invalid email or password' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Standby mode password comparison failure' });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
    // --- DB MODE ---
    if (isDBConnected()) {
        try {
            const user = await User.findById(req.user.id).select('-password');
            if (!user) return res.status(404).json({ error: 'User not found' });
            return res.json(user);
        } catch (err) {
            return res.status(500).json({ error: 'Server error getting profile' });
        }
    }

    // --- STANDBY IN-MEMORY MODE ---
    const user = mockUsers.find(u => u._id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Return profile without password field
    const { password, ...safeUser } = user;
    res.json(safeUser);
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { fullName, email, mobileNumber, avatar } = req.body;

    // --- DB MODE ---
    if (isDBConnected()) {
        try {
            const user = await User.findById(req.user.id);
            if (!user) return res.status(404).json({ error: 'User not found' });

            if (email && email.toLowerCase() !== user.email.toLowerCase()) {
                const emailInUse = await User.findOne({ email });
                if (emailInUse) {
                    return res.status(400).json({ error: 'Email address is already in use' });
                }
                user.email = email;
            }

            user.fullName = fullName || user.fullName;
            user.mobileNumber = mobileNumber || user.mobileNumber;
            user.avatar = avatar !== undefined ? avatar : user.avatar;

            const updatedUser = await user.save();
            return res.json({
                message: 'Profile updated successfully! 🌱',
                user: {
                    id: updatedUser._id,
                    fullName: updatedUser.fullName,
                    email: updatedUser.email,
                    mobileNumber: updatedUser.mobileNumber,
                    role: updatedUser.role,
                    avatar: updatedUser.avatar
                }
            });
        } catch (err) {
            return res.status(500).json({ error: 'Server error updating profile' });
        }
    }

    // --- STANDBY IN-MEMORY MODE ---
    const user = mockUsers.find(u => u._id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
        if (mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            return res.status(400).json({ error: 'Email address is already in use' });
        }
        user.email = email.toLowerCase();
    }

    user.fullName = fullName || user.fullName;
    user.mobileNumber = mobileNumber || user.mobileNumber;
    user.avatar = avatar !== undefined ? avatar : user.avatar;

    res.json({
        message: 'Profile updated successfully! (Standby Mode) 🌱',
        user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            mobileNumber: user.mobileNumber,
            role: user.role,
            avatar: user.avatar
        }
    });
};

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
exports.changePassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { currentPassword, newPassword } = req.body;

    // --- DB MODE ---
    if (isDBConnected()) {
        try {
            const user = await User.findById(req.user.id);
            if (!user) return res.status(404).json({ error: 'User not found' });

            const isMatch = await user.comparePassword(currentPassword);
            if (!isMatch) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }

            user.password = newPassword;
            await user.save();

            return res.json({ message: 'Password changed successfully! 🔐' });
        } catch (err) {
            return res.status(500).json({ error: 'Server error changing password' });
        }
    }

    // --- STANDBY IN-MEMORY MODE ---
    const user = mockUsers.find(u => u._id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    try {
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        res.json({ message: 'Password changed successfully! (Standby Mode) 🔐' });
    } catch (err) {
        res.status(500).json({ error: 'Standby mode password encryption failure' });
    }
};
