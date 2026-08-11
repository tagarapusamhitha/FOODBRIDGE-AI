const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Donation = require('../models/Donation');
const notifService = require('../services/notificationService');
const { geocodeAddress } = require('../services/geocodingService');

const isDBConnected = () => mongoose.connection.readyState === 1;

// Map status transitions to notification metadata
function getStatusNotifMeta(status, donation, ngoUser) {
    const donorEmail = donation.donor && donation.donor.email;
    const donorName  = donation.donor && donation.donor.fullName;
    const ngoName    = ngoUser && (ngoUser.fullName || ngoUser.email) || 'The NGO';
    const food       = donation.foodName;
    const qty        = (donation.quantity || '').replace(/[^0-9.]/g, '') || '?';

    const map = {
        'accepted': {
            type: 'donation_accepted',
            title: '🤝 Donation Accepted!',
            message: `${ngoName} has accepted your donation of ${food}.`,
            emailData: { donorName, ngoName, foodName: food, quantity: qty, ngoArea: 'Nearby' }
        },
        'picked up': {
            type: 'pickup_started',
            title: '🚚 Pickup Started!',
            message: `${ngoName} is on the way to pick up your ${food}.`,
            emailData: { donorName, ngoName, foodName: food, eta: '30-60 minutes' }
        },
        'delivered': {
            type: 'delivered',
            title: '✅ Food Delivered!',
            message: `${food} has been successfully delivered. You prevented ~${Math.round(parseFloat(qty) * 2.5)} kg of CO₂!`,
            emailData: { donorName, ngoName, foodName: food, quantity: qty }
        }
    };
    return map[status] ? { ...map[status], userEmail: donorEmail } : null;
}

// Global in-memory storage for standby mode (spread across India)
let mockDonations = [
    {
        _id: 'mock-don-1',
        donor: { _id: 'mock-donor-id-54321', fullName: 'Test Donor', email: 'test@example.com', mobileNumber: '9876543210' },
        donorName: 'Test Donor',
        donorPhone: '9876543210',
        donorEmail: 'test@example.com',
        foodName: 'Rice Meals',
        category: 'Cooked Meals',
        quantity: '20 plates',
        location: 'Indiranagar, Bangalore',
        address: 'Indiranagar, Bangalore',
        city: 'Bangalore',
        district: 'Bengaluru Urban',
        state: 'Karnataka',
        pincode: '560038',
        latitude: 12.9716,
        longitude: 77.5946,
        expiry: 'Today 6 PM',
        expiryDate: new Date(Date.now() + 6 * 3600000),
        status: 'available',
        claimedBy: null,
        createdAt: new Date()
    },
    {
        _id: 'mock-don-2',
        donor: { _id: 'mock-donor-id-54321', fullName: 'Test Donor', email: 'test@example.com', mobileNumber: '9876543210' },
        donorName: 'Test Donor',
        donorPhone: '9876543210',
        donorEmail: 'test@example.com',
        foodName: 'Bread & Snacks',
        category: 'Bakery & Bread',
        quantity: '50 packs',
        location: 'Andheri East, Mumbai',
        address: 'Andheri East, Mumbai',
        city: 'Mumbai',
        district: 'Mumbai Suburban',
        state: 'Maharashtra',
        pincode: '400069',
        latitude: 19.1136,
        longitude: 72.8697,
        expiry: 'Tomorrow 10 AM',
        expiryDate: new Date(Date.now() + 24 * 3600000),
        status: 'available',
        claimedBy: null,
        createdAt: new Date()
    }
];

// @desc    Create new donation listing
// @route   POST /api/donations
// @access  Private (Donor only)
exports.createDonation = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }

    const {
        foodName, quantity, location, expiry, expiryDate,
        category, address, city, district, state, pincode,
        latitude, longitude, imageUrl
    } = req.body;

    // Resolve GPS coordinates: prefer client-provided, otherwise geocode address
    let lat = latitude || null;
    let lng = longitude || null;
    if (!lat || !lng) {
        const locationObj = { address: address || location, city, district, state, pincode };
        const coords = await geocodeAddress(locationObj);
        if (coords) {
            lat = coords.lat;
            lng = coords.lng;
        }
    }

    // Build human-readable expiry string from expiryDate if provided but expiry not
    let expiryStr = expiry || 'Not specified';
    let expiryDateObj = expiryDate ? new Date(expiryDate) : null;
    if (expiryDateObj && isNaN(expiryDateObj)) expiryDateObj = null;
    if (expiryDateObj && (!expiry || expiry === 'Not specified')) {
        expiryStr = expiryDateObj.toLocaleString();
    }

    // --- DB MODE ---
    if (isDBConnected()) {
        try {
            const donation = await Donation.create({
                donor: req.user.id,
                donorName: req.user.fullName || req.body.donorName || '',
                donorPhone: req.user.mobileNumber || req.body.donorPhone || '',
                donorEmail: req.user.email || req.body.donorEmail || '',
                foodName,
                category: category || 'Other',
                quantity,
                location: location || address || '',
                address: address || location || '',
                city: city || '',
                district: district || '',
                state: state || '',
                pincode: pincode || '',
                latitude: lat,
                longitude: lng,
                imageUrl: imageUrl || '',
                expiry: expiryStr,
                expiryDate: expiryDateObj,
                status: 'available'
            });

            const populatedDonation = await Donation.findById(donation._id).populate('donor', 'fullName email mobileNumber');
            return res.status(201).json({
                message: 'Surplus food donated successfully 🎉',
                data: populatedDonation
            });
        } catch (err) {
            console.error('Create Donation Error:', err.message);
            return res.status(500).json({ error: 'Server error creating donation' });
        }
    }

    // --- STANDBY IN-MEMORY MODE ---
    console.log('[STANDBY MODE] Processing create donation in-memory');
    const newDonation = {
        _id: 'mock-don-' + Date.now(),
        donor: {
            _id: req.user.id,
            fullName: req.user.fullName,
            email: req.user.email,
            mobileNumber: req.user.mobileNumber
        },
        donorName: req.user.fullName || req.body.donorName || '',
        donorPhone: req.user.mobileNumber || req.body.donorPhone || '',
        donorEmail: req.user.email || req.body.donorEmail || '',
        foodName,
        category: category || 'Other',
        quantity,
        location: location || address || '',
        address: address || location || '',
        city: city || '',
        district: district || '',
        state: state || '',
        pincode: pincode || '',
        latitude: lat,
        longitude: lng,
        imageUrl: imageUrl || '',
        expiry: expiryStr,
        expiryDate: expiryDateObj,
        status: 'available',
        claimedBy: null,
        createdAt: new Date()
    };

    mockDonations.unshift(newDonation);
    res.status(201).json({
        message: 'Surplus food donated successfully (Standby Mode) 🎉',
        data: newDonation
    });
};

// @desc    Get all active/unclaimed donations
// @route   GET /api/donations
// @access  Public
exports.getDonations = async (req, res) => {
    // --- DB MODE ---
    if (isDBConnected()) {
        try {
            const donations = await Donation.find()
                .populate('donor', 'fullName email mobileNumber')
                .populate('claimedBy', 'fullName email mobileNumber')
                .sort({ createdAt: -1 });
            return res.json(donations);
        } catch (err) {
            console.error('Get Donations Error:', err.message);
            return res.status(500).json({ error: 'Server error retrieving donations' });
        }
    }

    // --- STANDBY IN-MEMORY MODE ---
    console.log('[STANDBY MODE] Processing get donations in-memory');
    res.json(mockDonations);
};

// @desc    Claim / Request food donation
// @route   POST /api/donations/claim
// @access  Private (NGO only)
exports.claimDonation = async (req, res) => {
    const { id } = req.body;

    // --- DB MODE ---
    if (isDBConnected()) {
        try {
            let donation = await Donation.findById(id);

            if (!donation) {
                return res.status(404).json({ error: 'Donation listing not found' });
            }

            if (donation.status === 'claimed' || donation.status === 'accepted' || donation.status === 'picked up') {
                return res.status(400).json({ error: 'Food listing has already been claimed by another center' });
            }

            donation.status = 'accepted';
            donation.claimedBy = req.user.id;
            donation.acceptedAt = new Date();
            await donation.save();

            const updatedDonation = await Donation.findById(donation._id)
                .populate('donor', 'fullName email mobileNumber')
                .populate('claimedBy', 'fullName email mobileNumber');

            return res.json({
                message: 'Food requested successfully! NGO has been notified. 🤝',
                data: updatedDonation
            });
        } catch (err) {
            console.error('Claim Donation Error:', err.message);
            return res.status(500).json({ error: 'Server error claiming donation' });
        }
    }

    // --- STANDBY IN-MEMORY MODE ---
    console.log('[STANDBY MODE] Processing claim donation in-memory');
    const donation = mockDonations.find(d => d._id === id);

    if (!donation) {
        return res.status(404).json({ error: 'Donation listing not found' });
    }

    if (donation.status === 'claimed' || donation.status === 'accepted' || donation.status === 'picked up') {
        return res.status(400).json({ error: 'Food listing has already been claimed' });
    }

    donation.status = 'accepted';
    donation.acceptedAt = new Date();
    donation.claimedBy = {
        _id: req.user.id,
        fullName: req.user.fullName,
        email: req.user.email,
        mobileNumber: req.user.mobileNumber
    };

    res.json({
        message: 'Food requested successfully! NGO has been notified. (Standby Mode) 🤝',
        data: donation
    });
};

// @desc    Get donation history for user
// @route   GET /api/donations/history
// @access  Private
exports.getDonationHistory = async (req, res) => {
    // --- DB MODE ---
    if (isDBConnected()) {
        try {
            let query = {};
            if (req.user.role === 'Donor') {
                query = { donor: req.user.id };
            } else if (req.user.role === 'NGO') {
                query = { claimedBy: req.user.id };
            }

            const history = await Donation.find(query)
                .populate('donor', 'fullName email mobileNumber')
                .populate('claimedBy', 'fullName email mobileNumber')
                .sort({ createdAt: -1 });

            return res.json(history);
        } catch (err) {
            console.error('Get History Error:', err.message);
            return res.status(500).json({ error: 'Server error fetching donation history' });
        }
    }

    // --- STANDBY IN-MEMORY MODE ---
    console.log('[STANDBY MODE] Processing get history in-memory');
    let history = [];
    if (req.user.role === 'Donor') {
        history = mockDonations.filter(d => {
            const donorId = d.donor && (d.donor._id || d.donor.id);
            return donorId === req.user.id;
        });
    } else if (req.user.role === 'NGO') {
        history = mockDonations.filter(d => {
            const claimedId = d.claimedBy && (d.claimedBy._id || d.claimedBy.id);
            return claimedId === req.user.id;
        });
    } else {
        history = mockDonations; // Admin gets everything
    }

    res.json(history);
};

// Expose mock list reader for stats calculations in standby mode
exports.getMockDonationsList = () => {
    return mockDonations;
};

// @desc    Update donation status
// @route   PUT /api/donations/:id/status
// @access  Private (NGO or Admin)
exports.updateDonationStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['available', 'claimed', 'accepted', 'picked up', 'delivered'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
    }

    // Timestamp mapping for status transitions
    const statusTimestampMap = {
        'accepted': 'acceptedAt',
        'picked up': 'pickedUpAt',
        'delivered': 'deliveredAt'
    };

    // --- DB MODE ---
    if (isDBConnected()) {
        try {
            let donation = await Donation.findById(id);
            if (!donation) {
                return res.status(404).json({ error: 'Donation not found' });
            }

            // Check authorization
            if (req.user.role === 'NGO' && donation.claimedBy && donation.claimedBy.toString() !== req.user.id) {
                return res.status(403).json({ error: 'You are not authorized to update this listing status' });
            }

            if (status === 'available') {
                donation.status = 'available';
                donation.claimedBy = null;
            } else {
                donation.status = status;
                if ((status === 'accepted' || status === 'picked up' || status === 'delivered') && !donation.claimedBy) {
                    donation.claimedBy = req.user.id;
                }
                // Set the corresponding timestamp
                const tsField = statusTimestampMap[status];
                if (tsField) {
                    donation[tsField] = new Date();
                }
            }

            await donation.save();
            const updated = await Donation.findById(donation._id)
                .populate('donor', 'fullName email mobileNumber')
                .populate('claimedBy', 'fullName email mobileNumber');

            // Fire notification to donor (non-blocking)
            const notifMeta = getStatusNotifMeta(status, updated, req.user);
            if (notifMeta) {
                notifService.sendNotification(notifMeta).catch(e => console.error('Notif error:', e.message));
            }

            return res.json({
                message: `Donation status updated to '${status}' successfully! 🚀`,
                data: updated
            });
        } catch (err) {
            console.error('Update Status Error:', err.message);
            return res.status(500).json({ error: 'Server error updating status' });
        }
    }

    // --- STANDBY IN-MEMORY MODE ---
    console.log('[STANDBY MODE] Processing update status in-memory');
    const donation = mockDonations.find(d => d._id === id);
    if (!donation) {
        return res.status(404).json({ error: 'Donation not found' });
    }

    const claimedId = donation.claimedBy && (donation.claimedBy._id || donation.claimedBy.id);
    if (req.user.role === 'NGO' && claimedId && claimedId !== req.user.id) {
        return res.status(403).json({ error: 'You are not authorized to update this listing status' });
    }

    if (status === 'available') {
        donation.status = 'available';
        donation.claimedBy = null;
    } else {
        donation.status = status;
        if ((status === 'accepted' || status === 'picked up' || status === 'delivered') && !donation.claimedBy) {
            donation.claimedBy = {
                _id: req.user.id,
                fullName: req.user.fullName,
                email: req.user.email,
                mobileNumber: req.user.mobileNumber
            };
        }
        // Set the corresponding timestamp
        const tsField = statusTimestampMap[status];
        if (tsField) {
            donation[tsField] = new Date();
        }
    }

    // Fire notification to donor (non-blocking, standby)
    const notifMeta = getStatusNotifMeta(status, donation, req.user);
    if (notifMeta) {
        notifService.sendNotification(notifMeta).catch(e => console.error('Notif error:', e.message));
    }

    res.json({
        message: `Donation status updated to '${status}' successfully! (Standby Mode) 🚀`,
        data: donation
    });
};

// Alias for backwards compatibility
exports.getMockDonationsList = () => mockDonations;