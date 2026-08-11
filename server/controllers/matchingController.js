const mongoose = require('mongoose');
const User = require('../models/User');
const Donation = require('../models/Donation');
const MatchHistory = require('../models/MatchHistory');
const { geocodeAddress, haversineDistance } = require('../services/geocodingService');

const isDBConnected = () => mongoose.connection.readyState === 1;

// Mock NGOs for Standby Mode (spread across India — no hardcoded state)
const mockNgos = [
    {
        _id: 'mock-ngo-1',
        fullName: 'Annapurna Trust',
        email: 'annapurna@ngo.org',
        mobileNumber: '9988776655',
        location: 'Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        latitude: 12.9716,
        longitude: 77.5946,
        capacity: 150,
        preferences: 'Meals, Vegetables',
        availability: 'Active'
    },
    {
        _id: 'mock-ngo-2',
        fullName: 'Save Food India',
        email: 'savefood@ngo.org',
        mobileNumber: '8877665544',
        location: 'Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        latitude: 19.0760,
        longitude: 72.8777,
        capacity: 100,
        preferences: 'Meals, Bread, Snacks',
        availability: 'Active'
    },
    {
        _id: 'mock-ngo-3',
        fullName: 'Hunger Relief Foundation',
        email: 'hunger@ngo.org',
        mobileNumber: '7766554433',
        location: 'Delhi',
        city: 'Delhi',
        state: 'Delhi',
        latitude: 28.6139,
        longitude: 77.2090,
        capacity: 200,
        preferences: 'Vegetables, Meals',
        availability: 'Active'
    },
    {
        _id: 'mock-ngo-4',
        fullName: 'Youth Helping Hands',
        email: 'youthhelp@ngo.org',
        mobileNumber: '6655443322',
        location: 'Chennai',
        city: 'Chennai',
        state: 'Tamil Nadu',
        latitude: 13.0827,
        longitude: 80.2707,
        capacity: 50,
        preferences: 'Snacks, Bread',
        availability: 'Busy'
    },
    {
        _id: 'mock-ngo-5',
        fullName: 'Mercy Feeding Center',
        email: 'mercyfeed@ngo.org',
        mobileNumber: '5544332211',
        location: 'Kolkata',
        city: 'Kolkata',
        state: 'West Bengal',
        latitude: 22.5726,
        longitude: 88.3639,
        capacity: 120,
        preferences: 'Meals, Vegetables, Snacks',
        availability: 'Active'
    }
];

// In-memory assignment logs for Standby Mode
let mockMatchHistory = [];

// Traffic multiplier based on time of day (deterministic, no external API)
function getTrafficMultiplier() {
    const hour = new Date().getHours();
    // Peak hours: 8-11 AM, 5-9 PM
    if ((hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 21)) {
        return 1.35; // Heavy traffic
    }
    if ((hour >= 6 && hour < 8) || (hour >= 12 && hour < 17)) {
        return 1.15; // Moderate traffic
    }
    return 1.0; // Light traffic late night
}

// Weather factor (stable within a day, deterministic simulation)
function getWeatherFactor() {
    const dayOfYear = Math.floor(Date.now() / 86400000);
    const hash = (dayOfYear * 7 + 13) % 10;
    if (hash < 2) return 1.25;  // Rainy — slower delivery
    if (hash < 4) return 1.1;   // Overcast
    return 1.0;                 // Clear
}

// Resolve donation coordinates (stored or geocoded)
async function getDonationCoords(donation) {
    if (donation.latitude && donation.longitude) {
        return { lat: donation.latitude, lng: donation.longitude };
    }
    const locationObj = {
        address: donation.address || donation.location,
        city: donation.city,
        district: donation.district,
        state: donation.state,
        pincode: donation.pincode
    };
    return await geocodeAddress(locationObj);
}

// Resolve NGO coordinates (stored or geocoded from city)
async function getNGOCoords(ngo) {
    if (ngo.latitude && ngo.longitude) {
        return { lat: ngo.latitude, lng: ngo.longitude };
    }
    const city = ngo.city || ngo.location || '';
    return await geocodeAddress(city);
}

// Calculate matching score out of 100 (All-India, GPS-based)
async function calculateMatchScore(donation, ngo) {
    let score = 0;

    // Resolve coordinates
    const donCoords = await getDonationCoords(donation);
    const ngoCoords = await getNGOCoords(ngo);

    // 1. Distance Score (max 40 pts) — Haversine GPS distance
    let distance = 15; // Default fallback km
    if (donCoords && ngoCoords) {
        const d = haversineDistance(
            donCoords.lat, donCoords.lng,
            ngoCoords.lat, ngoCoords.lng
        );
        if (d !== null) distance = d;
    }

    if (distance <= 5) score += 40;
    else if (distance <= 15) score += 30;
    else if (distance <= 30) score += 20;
    else if (distance <= 60) score += 10;
    else score += 4;

    // 2. Food Category Preference Match (max 20 pts)
    const foodName = (donation.foodName || '').toLowerCase();
    const category = (donation.category || 'Other').toLowerCase();
    const prefs = (ngo.preferences || 'Meals, Vegetables, Snacks, Bread').toLowerCase();

    let isPrefMatch = false;
    if (category.includes('cooked') || foodName.includes('rice') || foodName.includes('meal') || foodName.includes('curry') || foodName.includes('biryani')) {
        if (prefs.includes('meal')) isPrefMatch = true;
    }
    if (category.includes('bakery') || foodName.includes('bread') || foodName.includes('snack') || foodName.includes('pack')) {
        if (prefs.includes('bread') || prefs.includes('snack')) isPrefMatch = true;
    }
    if (category.includes('produce') || foodName.includes('vegetable') || foodName.includes('fruit') || foodName.includes('veg')) {
        if (prefs.includes('vegetables') || prefs.includes('veg') || prefs.includes('fruit')) isPrefMatch = true;
    }
    if (category.includes('dairy') || foodName.includes('milk') || foodName.includes('curd') || foodName.includes('paneer')) {
        if (prefs.includes('dairy') || prefs.includes('milk')) isPrefMatch = true;
    }

    if (isPrefMatch) score += 20;

    // 3. Expiry / Urgency Match (max 20 pts)
    const expiryStr = (donation.expiry || '').toLowerCase();
    const expiryDate = donation.expiryDate ? new Date(donation.expiryDate) : null;
    let isUrgent = false;

    if (expiryDate && !isNaN(expiryDate)) {
        const hoursLeft = (expiryDate - Date.now()) / 3600000;
        if (hoursLeft <= 4) isUrgent = true;
    } else {
        isUrgent = expiryStr.includes('today') || expiryStr.includes('pm') || expiryStr.includes('hr') || expiryStr.includes('hour');
    }

    if (isUrgent) {
        score += 15;
        if (distance <= 15) score += 5; // Urgent + Proximity bonus
    } else {
        score += 10;
    }

    // 4. Quantity vs NGO Capacity (max 20 pts)
    const match = (donation.quantity || '').match(/(\d+)/);
    const qtyNum = match ? parseInt(match[1]) : 10;
    const capacity = ngo.capacity || 100;

    if (qtyNum <= capacity) {
        score += 20;
    } else if (qtyNum <= capacity * 1.5) {
        score += 12;
    } else {
        score += 5;
    }

    // 5. Emergency Priority / NGO Availability (modifiers)
    const availability = (ngo.availability || 'Active').toLowerCase();
    if (availability === 'inactive') {
        score -= 15;
    } else if (availability === 'busy') {
        score -= 8;
    } else {
        score += 5; // Active bonus
    }

    // Normalize final score between 10 and 100
    const finalScore = Math.max(10, Math.min(100, Math.round(score)));

    // Determine priority
    let priority = 'Medium';
    if (finalScore >= 80) priority = 'High';
    else if (finalScore < 50) priority = 'Low';

    // Pickup ETA (with traffic + weather factors)
    const trafficMultiplier = getTrafficMultiplier();
    const weatherFactor = getWeatherFactor();
    const baseMinutes = Math.round(distance * 2.2 + 12);
    const estimatedPickup = Math.round(baseMinutes * trafficMultiplier * weatherFactor);

    // Build reason string for transparency
    const reasons = [];
    if (distance <= 15) reasons.push('very close proximity');
    else if (distance <= 30) reasons.push('within short drive distance');
    if (isPrefMatch) reasons.push('food category matches preferences');
    if (isUrgent) reasons.push('urgent expiry timeline');
    if (qtyNum <= capacity) reasons.push('quantity fits within capacity');
    if (availability === 'active') reasons.push('NGO is active and available');
    const reason = reasons.length > 0 ? reasons.slice(0, 3).join(', ') : 'standard availability match';

    return {
        score: finalScore,
        distance: Math.round(distance * 10) / 10,
        priority,
        estimatedPickup: `${estimatedPickup} mins`,
        reason
    };
}

// @desc    Get top recommended NGOs for a donation listing
// @route   GET /api/matching/donations/:id
// @access  Private
exports.getRecommendations = async (req, res) => {
    const { id } = req.params;

    // --- DB MODE ---
    if (isDBConnected()) {
        try {
            const donation = await Donation.findById(id);
            if (!donation) {
                return res.status(404).json({ error: 'Donation listing not found' });
            }

            // Fetch all NGOs in the DB
            const ngos = await User.find({ role: 'NGO' });

            // Build matching scores list (parallelized for performance)
            const withScores = await Promise.all(
                ngos.map(async ngo => {
                    const matchMetrics = await calculateMatchScore(donation, ngo);
                    return {
                        ngo: {
                            id: ngo._id,
                            fullName: ngo.fullName,
                            email: ngo.email,
                            mobileNumber: ngo.mobileNumber,
                            location: ngo.city || ngo.location || '',
                            city: ngo.city || '',
                            state: ngo.state || '',
                            capacity: ngo.capacity || 100,
                            availability: ngo.availability || 'Active'
                        },
                        score: matchMetrics.score,
                        distance: matchMetrics.distance,
                        priority: matchMetrics.priority,
                        estimatedPickup: matchMetrics.estimatedPickup,
                        reason: matchMetrics.reason
                    };
                })
            );

            // Sort by score descending (tiebreak by distance ascending) and take top 5
            withScores.sort((a, b) => b.score - a.score || a.distance - b.distance);
            const top5 = withScores.slice(0, 5);

            return res.json({
                donation: {
                    id: donation._id,
                    foodName: donation.foodName,
                    quantity: donation.quantity,
                    location: donation.location || donation.address,
                    category: donation.category || 'Other'
                },
                best: top5[0] || null,
                recommendations: top5
            });

        } catch (err) {
            console.error('Recommendations Error:', err.message);
            return res.status(500).json({ error: 'Server error retrieving matching recommendations' });
        }
    }

    // --- STANDBY IN-MEMORY MODE ---
    console.log('[STANDBY MODE] Processing AI recommendations in-memory');
    const donationController = require('./donationController');
    const mockList = donationController.getMockDonationsList();

    const donation = mockList.find(d => d._id === id);
    if (!donation) {
        return res.status(404).json({ error: 'Donation listing not found' });
    }

    // Compile match metrics against all NGOs (shared user list + mock NGOs)
    const authController = require('./authController');
    const allUsers = authController.getMockUsersList();
    const registeredNgos = allUsers.filter(u => u.role === 'NGO');

    // Combine registered NGOs with the default mock NGOs
    const allNgos = [...registeredNgos, ...mockNgos.filter(mn => !registeredNgos.some(rn => rn._id === mn._id))];

    const recommendations = [];
    for (const ngo of allNgos) {
        const metrics = await calculateMatchScore(donation, ngo);
        recommendations.push({
            ngo: {
                id: ngo._id,
                fullName: ngo.fullName,
                email: ngo.email,
                mobileNumber: ngo.mobileNumber,
                location: ngo.location || ngo.city || '',
                city: ngo.city || '',
                state: ngo.state || '',
                capacity: ngo.capacity || 100,
                availability: ngo.availability || 'Active'
            },
            score: metrics.score,
            distance: metrics.distance,
            priority: metrics.priority,
            estimatedPickup: metrics.estimatedPickup,
            reason: metrics.reason
        });
    }

    recommendations.sort((a, b) => b.score - a.score || a.distance - b.distance);
    const top5 = recommendations.slice(0, 5);

    res.json({
        donation: {
            id: donation._id,
            foodName: donation.foodName,
            quantity: donation.quantity,
            location: donation.location || donation.address,
            category: donation.category || 'Other'
        },
        best: top5[0] || null,
        recommendations: top5
    });
};

// @desc    Assign donation to an NGO
// @route   POST /api/matching/assign
// @access  Private (Donor or Admin)
exports.assignDonation = async (req, res) => {
    const { donationId, ngoId, score, distance, priority } = req.body;

    if (!donationId || !ngoId) {
        return res.status(400).json({ error: 'Donation ID and NGO ID are required' });
    }

    // --- DB MODE ---
    if (isDBConnected()) {
        try {
            const donation = await Donation.findById(donationId);
            if (!donation) return res.status(404).json({ error: 'Donation not found' });

            donation.status = 'accepted';
            donation.claimedBy = ngoId;
            donation.acceptedAt = new Date();
            await donation.save();

            // Store in MatchHistory
            const matchRecord = await MatchHistory.create({
                donation: donationId,
                ngo: ngoId,
                score: score || 85,
                distance: distance || 5,
                priority: priority || 'High',
                assigned: true
            });

            return res.json({
                message: 'Surplus food assigned to NGO successfully! 🤝',
                data: matchRecord
            });
        } catch (err) {
            console.error('Assign Error:', err.message);
            return res.status(500).json({ error: 'Server error assigning donation' });
        }
    }

    // --- STANDBY IN-MEMORY MODE ---
    console.log('[STANDBY MODE] Processing assignment in-memory');
    const donationController = require('./donationController');
    const mockList = donationController.getMockDonationsList();

    const donation = mockList.find(d => d._id === donationId);
    if (!donation) return res.status(404).json({ error: 'Donation not found' });

    const ngo = mockNgos.find(n => n._id === ngoId);
    if (!ngo) return res.status(404).json({ error: 'NGO partner not found' });

    donation.status = 'accepted';
    donation.claimedBy = {
        _id: ngo._id,
        fullName: ngo.fullName,
        email: ngo.email,
        mobileNumber: ngo.mobileNumber
    };

    const newRecord = {
        _id: 'mock-match-' + Date.now(),
        donation: donationId,
        ngo: ngoId,
        score: score || 85,
        distance: distance || 5.2,
        priority: priority || 'High',
        assigned: true,
        createdAt: new Date()
    };

    mockMatchHistory.push(newRecord);

    res.json({
        message: 'Surplus food assigned to NGO successfully! (Standby Mode) 🤝',
        data: newRecord
    });
};

// @desc    Retrieve dynamic recommendations directly for an NGO user
// @route   GET /api/matching/ngo-recommendations
// @access  Private (NGO only)
exports.getNGORecommendationScore = async (req, res) => {
    const donationId = req.query.donationId;
    if (!donationId) {
        return res.status(400).json({ error: 'Donation ID query param is required' });
    }

    // Find the donation listing
    let donation;
    if (isDBConnected()) {
        donation = await Donation.findById(donationId);
    } else {
        const donationController = require('./donationController');
        const mockList = donationController.getMockDonationsList();
        donation = mockList.find(d => d._id === donationId);
    }

    if (!donation) {
        return res.status(404).json({ error: 'Donation listing not found' });
    }

    // Compute metrics relative to the current logged-in NGO
    const metrics = await calculateMatchScore(donation, req.user);
    res.json({
        donationId: donation._id,
        ngoId: req.user.id,
        score: metrics.score,
        distance: metrics.distance,
        priority: metrics.priority,
        estimatedPickup: metrics.estimatedPickup,
        reason: metrics.reason
    });
};