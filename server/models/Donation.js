const mongoose = require('mongoose');

const DonationSchema = new mongoose.Schema({
    donor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Donor contact snapshot (preserved on the donation record itself)
    donorName: {
        type: String,
        default: ''
    },
    donorPhone: {
        type: String,
        default: ''
    },
    donorEmail: {
        type: String,
        default: ''
    },
    foodName: {
        type: String,
        required: [true, 'Please specify the food name'],
        trim: true
    },
    category: {
        type: String,
        enum: ['Cooked Meals', 'Bakery & Bread', 'Fresh Produce', 'Packaged Food', 'Dairy', 'Other'],
        default: 'Other'
    },
    quantity: {
        type: String,
        required: [true, 'Please specify the quantity'],
        trim: true
    },
    // Legacy single-line location string (kept for backwards compatibility with existing frontend/API consumers)
    location: {
        type: String,
        required: [true, 'Please specify pickup location'],
        trim: true
    },
    // Structured address fields — supports the entire country of India
    address: {
        type: String,
        default: '',
        trim: true
    },
    city: {
        type: String,
        default: '',
        trim: true
    },
    district: {
        type: String,
        default: '',
        trim: true
    },
    state: {
        type: String,
        default: '',
        trim: true
    },
    pincode: {
        type: String,
        default: '',
        trim: true
    },
    // GPS coordinates (permanently stored once resolved via geocoding)
    latitude: {
        type: Number,
        default: null
    },
    longitude: {
        type: Number,
        default: null
    },
    imageUrl: {
        type: String,
        default: ''
    },
    // Human-readable expiry string (kept for backwards compatibility)
    expiry: {
        type: String,
        default: 'Not specified'
    },
    // Structured expiry for AI urgency scoring
    expiryDate: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['available', 'claimed', 'accepted', 'picked up', 'delivered'],
        default: 'available'
    },
    claimedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    acceptedAt: {
        type: Date,
        default: null
    },
    pickedUpAt: {
        type: Date,
        default: null
    },
    deliveredAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Geospatial index for hunger-map queries
DonationSchema.index({ latitude: 1, longitude: 1 });

// State / city lookups for All-India filters
DonationSchema.index({ state: 1, city: 1 });

// Status + recency for dashboards
DonationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Donation', DonationSchema);