const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    userEmail: {
        type: String,
        default: null
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['donation_accepted', 'pickup_started', 'delivered', 'ai_recommendation', 'new_donation_nearby', 'general'],
        default: 'general'
    },
    relatedDonationId: {
        type: String,
        default: null
    },
    relatedNgoId: {
        type: String,
        default: null
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Index for fast user-specific queries
notificationSchema.index({ userEmail: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
