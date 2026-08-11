const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Please enter your full name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please enter an email address'],
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: [true, 'Please enter a password'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    mobileNumber: {
        type: String,
        required: [true, 'Please enter your mobile number'],
        trim: true
    },
    role: {
        type: String,
        enum: ['Donor', 'NGO', 'Admin'],
        default: 'Donor'
    },
    avatar: {
        type: String,
        default: ''
    },
    // ─── NGO-specific fields (used for AI matching & map) ───────────────────
    location: {
        type: String,
        default: ''
    },
    city: {
        type: String,
        default: '',
        trim: true
    },
    state: {
        type: String,
        default: '',
        trim: true
    },
    latitude: {
        type: Number,
        default: null
    },
    longitude: {
        type: Number,
        default: null
    },
    capacity: {
        type: Number,
        default: 100
    },
    preferences: {
        type: String,
        default: 'Meals, Vegetables, Snacks, Bread'
    },
    availability: {
        type: String,
        enum: ['Active', 'Busy', 'Inactive'],
        default: 'Active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save password hashing
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password helper
UserSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Index for NGO role + location queries
UserSchema.index({ role: 1, state: 1, city: 1 });

module.exports = mongoose.model('User', UserSchema);