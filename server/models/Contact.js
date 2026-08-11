const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter your name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please enter a valid email'],
        trim: true,
        lowercase: true
    },
    subject: {
        type: String,
        required: [true, 'Please enter a subject'],
        trim: true
    },
    message: {
        type: String,
        required: [true, 'Please enter your message'],
        trim: true
    },
    status: {
        type: String,
        enum: ['new', 'read', 'responded'],
        default: 'new'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Contact', ContactSchema);