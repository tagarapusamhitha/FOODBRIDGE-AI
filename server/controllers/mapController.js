const mongoose = require('mongoose');
const Donation = require('../models/Donation');
const User = require('../models/User');
const { geocodeAddress, lookupCityCoords } = require('../services/geocodingService');

const isDBConnected = () => mongoose.connection.readyState === 1;

// India center point (used only as initial map view before data loads)
const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };

// Default mock donations for standby mode (spread across India, no hardcoded state)
const mockMapDonations = [
    {
        _id: 'mock-don-1',
        foodName: 'Rice Meals',
        quantity: '20 plates',
        location: 'Indiranagar, Bangalore',
        address: 'Indiranagar, Bangalore',
        city: 'Bangalore',
        district: 'Bengaluru Urban',
        state: 'Karnataka',
        pincode: '560038',
        latitude: 12.9716,
        longitude: 77.5946,
        category: 'Cooked Meals',
        expiry: 'Today 6 PM',
        status: 'available',
        donor: { fullName: 'Test Donor', mobileNumber: '9876543210' }
    },
    {
        _id: 'mock-don-2',
        foodName: 'Bread & Snacks',
        quantity: '50 packs',
        location: 'Andheri East, Mumbai',
        address: 'Andheri East, Mumbai',
        city: 'Mumbai',
        district: 'Mumbai Suburban',
        state: 'Maharashtra',
        pincode: '400069',
        latitude: 19.1136,
        longitude: 72.8697,
        category: 'Bakery & Bread',
        expiry: 'Tomorrow 10 AM',
        status: 'available',
        donor: { fullName: 'Test Donor', mobileNumber: '9876543210' }
    },
    {
        _id: 'mock-don-3',
        foodName: 'Fresh Vegetables',
        quantity: '15 kg',
        location: 'Karol Bagh, New Delhi',
        address: 'Karol Bagh, New Delhi',
        city: 'Delhi',
        district: 'Central Delhi',
        state: 'Delhi',
        pincode: '110005',
        latitude: 28.6519,
        longitude: 77.1909,
        category: 'Fresh Produce',
        expiry: 'Today 4 PM',
        status: 'available',
        donor: { fullName: 'Green Farm', mobileNumber: '9123456780' }
    },
    {
        _id: 'mock-don-4',
        foodName: 'Cooked Biryani',
        quantity: '40 plates',
        location: 'T Nagar, Chennai',
        address: 'T Nagar, Chennai',
        city: 'Chennai',
        district: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600017',
        latitude: 13.0418,
        longitude: 80.2341,
        category: 'Cooked Meals',
        expiry: 'Today 8 PM',
        status: 'accepted',
        donor: { fullName: 'Hotel Srinivasa', mobileNumber: '9988776655' }
    },
    {
        _id: 'mock-don-5',
        foodName: 'Idli & Sambar',
        quantity: '30 portions',
        location: 'Salt Lake, Kolkata',
        address: 'Salt Lake, Kolkata',
        city: 'Kolkata',
        district: 'North 24 Parganas',
        state: 'West Bengal',
        pincode: '700091',
        latitude: 22.5843,
        longitude: 88.4106,
        category: 'Cooked Meals',
        expiry: 'Today 2 PM',
        status: 'delivered',
        donor: { fullName: 'Tiffin Express', mobileNumber: '9090909090' }
    }
];

// In-memory mock NGOs for standby mode (spread across India)
const mockMapNGOs = [
    {
        _id: 'mock-ngo-1',
        fullName: 'Annapurna Trust',
        mobileNumber: '9988776655',
        email: 'annapurna@ngo.org',
        location: 'Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        latitude: 12.9716,
        longitude: 77.5946
    },
    {
        _id: 'mock-ngo-2',
        fullName: 'Save Food India',
        mobileNumber: '8877665544',
        email: 'savefood@ngo.org',
        location: 'Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        latitude: 19.0760,
        longitude: 72.8777
    },
    {
        _id: 'mock-ngo-3',
        fullName: 'Hunger Relief Foundation',
        mobileNumber: '7766554433',
        email: 'hunger@ngo.org',
        location: 'Delhi',
        city: 'Delhi',
        state: 'Delhi',
        latitude: 28.6139,
        longitude: 77.2090
    },
    {
        _id: 'mock-ngo-4',
        fullName: 'Youth Helping Hands',
        mobileNumber: '6655443322',
        email: 'youthhelp@ngo.org',
        location: 'Chennai',
        city: 'Chennai',
        state: 'Tamil Nadu',
        latitude: 13.0827,
        longitude: 80.2707
    },
    {
        _id: 'mock-ngo-5',
        fullName: 'Mercy Feeding Center',
        mobileNumber: '5544332211',
        email: 'mercyfeed@ngo.org',
        location: 'Kolkata',
        city: 'Kolkata',
        state: 'West Bengal',
        latitude: 22.5726,
        longitude: 88.3639
    }
];

// Resolve coordinates: prefer stored, otherwise geocode address on the fly
// Returns null if geocoding fails (no fake coordinates)
async function resolveCoords(donation) {
    if (donation.latitude && donation.longitude) {
        return { lat: donation.latitude, lng: donation.longitude };
    }
    // Also check for lat/lng shorthand
    if (donation.lat && donation.lng) {
        return { lat: donation.lat, lng: donation.lng };
    }

    const locationObj = {
        address: donation.address || donation.location,
        city: donation.city,
        district: donation.district,
        state: donation.state,
        pincode: donation.pincode
    };

    const coords = await geocodeAddress(locationObj);
    return coords; // Returns null if geocoding failed
}

// @desc    Get all donations with geo-coordinates across India
// @route   GET /api/map/donations
// @access  Public
exports.getMapDonations = async (req, res) => {
    if (isDBConnected()) {
        try {
            const donations = await Donation.find()
                .populate('donor', 'fullName mobileNumber')
                .lean();

            const mapped = [];
            for (const d of donations) {
                const coords = await resolveCoords(d);
                mapped.push({
                    id: d._id,
                    foodName: d.foodName,
                    quantity: d.quantity,
                    location: d.location || d.address,
                    address: d.address,
                    city: d.city,
                    district: d.district,
                    state: d.state,
                    pincode: d.pincode,
                    category: d.category || 'Other',
                    expiry: d.expiry || 'Not specified',
                    status: d.status,
                    donor: d.donor ? {
                        fullName: d.donor.fullName,
                        mobileNumber: d.donor.mobileNumber
                    } : { fullName: 'Anonymous', mobileNumber: 'N/A' },
                    lat: coords ? coords.lat : null,
                    lng: coords ? coords.lng : null,
                    latitude: coords ? coords.lat : null,
                    longitude: coords ? coords.lng : null
                });
            }

            return res.json(mapped);
        } catch (err) {
            console.error('Map donations error:', err.message);
            return res.status(500).json({ error: 'Error fetching map data' });
        }
    }

    // Standby mode — use the shared in-memory donation list so newly
    // created donations appear on the map immediately
    const donationController = require('./donationController');
    const sharedDonations = donationController.getMockDonationsList();

    const mapped = await Promise.all(sharedDonations.map(async d => {
        const coords = await resolveCoords(d);
        return {
            id: d._id,
            foodName: d.foodName,
            quantity: d.quantity,
            location: d.location || d.address,
            address: d.address,
            city: d.city,
            district: d.district,
            state: d.state,
            pincode: d.pincode,
            category: d.category || 'Other',
            expiry: d.expiry,
            status: d.status,
            donor: d.donor,
            lat: coords ? coords.lat : null,
            lng: coords ? coords.lng : null,
            latitude: coords ? coords.lat : null,
            longitude: coords ? coords.lng : null
        };
    }));

    res.json(mapped);
};

// @desc    Get all NGO locations with geo-coordinates across India
// @route   GET /api/map/ngos
// @access  Public
exports.getMapNGOs = async (req, res) => {
    if (isDBConnected()) {
        try {
            const ngos = await User.find({ role: 'NGO' })
                .select('fullName email mobileNumber latitude longitude city state location')
                .lean();

            const mapped = [];
            for (const ngo of ngos) {
                let coords;
                if (ngo.latitude && ngo.longitude) {
                    coords = { lat: ngo.latitude, lng: ngo.longitude };
                } else {
                    const city = ngo.city || ngo.location || '';
                    coords = await geocodeAddress(city);
                }
                mapped.push({
                    id: ngo._id,
                    fullName: ngo.fullName,
                    email: ngo.email,
                    mobileNumber: ngo.mobileNumber,
                    location: ngo.city || ngo.location || '',
                    city: ngo.city || '',
                    state: ngo.state || '',
                    lat: coords ? coords.lat : null,
                    lng: coords ? coords.lng : null,
                    latitude: coords ? coords.lat : null,
                    longitude: coords ? coords.lng : null
                });
            }

            return res.json(mapped);
        } catch (err) {
            console.error('Map NGOs error:', err.message);
            return res.status(500).json({ error: 'Error fetching NGO map data' });
        }
    }

    // Standby mode — combine shared user list (newly registered NGOs)
    // with the default mock NGOs so both appear on the map
    const authController = require('./authController');
    const allUsers = authController.getMockUsersList();
    const registeredNgos = allUsers.filter(u => u.role === 'NGO');

    // Combine registered NGOs with mock NGOs (avoid duplicates by _id)
    const allNgos = [...registeredNgos, ...mockMapNGOs.filter(mn => !registeredNgos.some(rn => rn._id === mn._id))];

    const mapped = allNgos.map(ngo => ({
        id: ngo._id,
        fullName: ngo.fullName,
        email: ngo.email,
        mobileNumber: ngo.mobileNumber,
        location: ngo.location || ngo.city || '',
        city: ngo.city || '',
        state: ngo.state || '',
        lat: ngo.latitude || null,
        lng: ngo.longitude || null,
        latitude: ngo.latitude || null,
        longitude: ngo.longitude || null
    }));

    res.json(mapped);
};

// @desc    Get all Indian states with counts (for filter dropdown)
//          Combines states from BOTH donations and NGO users so every
//          state present in the database appears in the dropdown.
// @route   GET /api/map/states
// @access  Public
exports.getMapStates = async (req, res) => {
    if (isDBConnected()) {
        try {
            const [donStates, ngoStates] = await Promise.all([
                Donation.aggregate([
                    { $match: { state: { $ne: '' } } },
                    { $group: { _id: '$state', count: { $sum: 1 } } }
                ]),
                User.aggregate([
                    { $match: { role: 'NGO', state: { $ne: '' } } },
                    { $group: { _id: '$state', count: { $sum: 1 } } }
                ])
            ]);

            const stateMap = {};
            donStates.forEach(s => { stateMap[s._id] = (stateMap[s._id] || 0) + s.count; });
            ngoStates.forEach(s => { stateMap[s._id] = (stateMap[s._id] || 0) + s.count; });

            const states = Object.entries(stateMap)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => a.name.localeCompare(b.name));

            return res.json(states);
        } catch (err) {
            return res.json([]);
        }
    }

    // Standby mode — derive from mock data (donations + NGOs)
    const stateCounts = {};
    mockMapDonations.forEach(d => {
        if (d.state) {
            stateCounts[d.state] = (stateCounts[d.state] || 0) + 1;
        }
    });
    mockMapNGOs.forEach(n => {
        if (n.state) {
            stateCounts[n.state] = (stateCounts[n.state] || 0) + 1;
        }
    });
    const states = Object.entries(stateCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name));
    res.json(states);
};

// @desc    Get districts (optionally filtered by state)
//          Districts come from donations (NGO users do not store a district
//          field), sorted alphabetically for a clean dropdown.
// @route   GET /api/map/districts
// @access  Public
exports.getMapDistricts = async (req, res) => {
    const { state } = req.query;
    if (isDBConnected()) {
        try {
            const match = { district: { $ne: '' } };
            if (state && state !== 'all') match.state = state;
            const districts = await Donation.aggregate([
                { $match: match },
                { $group: { _id: '$district', count: { $sum: 1 } } }
            ]);
            const mapped = districts
                .map(d => ({ name: d._id, count: d.count }))
                .sort((a, b) => a.name.localeCompare(b.name));
            return res.json(mapped);
        } catch (err) {
            return res.json([]);
        }
    }

    // Standby mode
    const distCounts = {};
    mockMapDonations.forEach(d => {
        if (d.district && (!state || state === 'all' || d.state === state)) {
            distCounts[d.district] = (distCounts[d.district] || 0) + 1;
        }
    });
    const mapped = Object.entries(distCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name));
    res.json(mapped);
};

// @desc    Get cities for dynamic autocomplete
//          Combines cities from BOTH donations and NGO users so the
//          autocomplete reflects every real place in the database.
// @route   GET /api/map/cities
// @access  Public
exports.getMapCities = async (req, res) => {
    const { state, district } = req.query;
    if (isDBConnected()) {
        try {
            const donMatch = { city: { $ne: '' } };
            if (state && state !== 'all') donMatch.state = state;
            if (district && district !== 'all') donMatch.district = district;

            const ngoMatch = { role: 'NGO', city: { $ne: '' } };
            if (state && state !== 'all') ngoMatch.state = state;

            const [donCities, ngoCities] = await Promise.all([
                Donation.aggregate([
                    { $match: donMatch },
                    { $group: { _id: '$city', count: { $sum: 1 } } }
                ]),
                User.aggregate([
                    { $match: ngoMatch },
                    { $group: { _id: '$city', count: { $sum: 1 } } }
                ])
            ]);

            const cityMap = {};
            donCities.forEach(c => { cityMap[c._id] = (cityMap[c._id] || 0) + c.count; });
            ngoCities.forEach(c => { cityMap[c._id] = (cityMap[c._id] || 0) + c.count; });

            const cities = Object.entries(cityMap)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => a.name.localeCompare(b.name));

            return res.json(cities);
        } catch (err) {
            return res.json([]);
        }
    }

    // Standby mode
    const cityCounts = {};
    mockMapDonations.forEach(d => {
        if (d.city && (!state || state === 'all' || d.state === state) && (!district || district === 'all' || d.district === district)) {
            cityCounts[d.city] = (cityCounts[d.city] || 0) + 1;
        }
    });
    mockMapNGOs.forEach(n => {
        if (n.city && (!state || state === 'all' || n.state === state)) {
            cityCounts[n.city] = (cityCounts[n.city] || 0) + 1;
        }
    });
    const cities = Object.entries(cityCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name));
    res.json(cities);
};

// @desc    Search locations across India using real database data
//          Searches states, districts, and cities from both donations & NGOs.
//          For address/street-level queries, falls back to Nominatim
//          (OpenStreetMap) forward geocoding — no fake data, no API key.
// @route   GET /api/map/search?q=query
// @access  Public
exports.searchLocations = async (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) {
        return res.json([]);
    }

    const results = [];
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    if (isDBConnected()) {
        try {
            // ─── 1. Search real states, districts, cities from database ───
            // States
            const donStates = await Donation.aggregate([
                { $match: { state: regex } },
                { $group: { _id: '$state', count: { $sum: 1 } } }
            ]);
            const ngoStates = await User.aggregate([
                { $match: { role: 'NGO', state: regex } },
                { $group: { _id: '$state', count: { $sum: 1 } } }
            ]);

            donStates.forEach(s => {
                if (s._id) results.push({ type: 'state', name: s._id, count: s.count });
            });
            ngoStates.forEach(s => {
                if (s._id) {
                    const existing = results.find(r => r.type === 'state' && r.name === s._id);
                    if (existing) existing.count += s.count;
                    else results.push({ type: 'state', name: s._id, count: s.count });
                }
            });

            // Districts (donations only — NGOs don't store district)
            const districts = await Donation.aggregate([
                { $match: { district: regex } },
                { $group: { _id: '$district', state: { $first: '$state' }, count: { $sum: 1 } } }
            ]);
            districts.forEach(d => {
                if (d._id) results.push({ type: 'district', name: d._id, state: d.state || '', count: d.count });
            });

            // Cities (donations + NGOs)
            const donCities = await Donation.aggregate([
                { $match: { city: regex } },
                { $group: { _id: '$city', state: { $first: '$state' }, district: { $first: '$district' }, count: { $sum: 1 } } }
            ]);
            const ngoCities = await User.aggregate([
                { $match: { role: 'NGO', city: regex } },
                { $group: { _id: '$city', state: { $first: '$state' }, count: { $sum: 1 } } }
            ]);

            donCities.forEach(c => {
                if (c._id) results.push({ type: 'city', name: c._id, state: c.state || '', district: c.district || '', count: c.count });
            });
            ngoCities.forEach(c => {
                if (c._id) {
                    const existing = results.find(r => r.type === 'city' && r.name === c._id && r.state === c.state);
                    if (existing) existing.count += c.count;
                    else results.push({ type: 'city', name: c._id, state: c.state || '', district: '', count: c.count });
                }
            });

            // ─── 2. If no database matches, try Nominatim forward geocoding ───
            if (results.length === 0) {
                const coords = await geocodeAddress(q);
                if (coords) {
                    results.push({
                        type: 'address',
                        name: q,
                        lat: coords.lat,
                        lng: coords.lng,
                        count: 0
                    });
                }
            }

            return res.json(results.slice(0, 25));
        } catch (err) {
            console.error('Location search error:', err.message);
            // Fall back to Nominatim on error
            const coords = await geocodeAddress(q);
            return res.json(coords ? [{ type: 'address', name: q, lat: coords.lat, lng: coords.lng, count: 0 }] : []);
        }
    }

    // --- STANDBY MODE ---
    const lowerQ = q.toLowerCase();
    // Search mock donations + NGOs
    mockMapDonations.forEach(d => {
        if (d.state && d.state.toLowerCase().includes(lowerQ)) {
            results.push({ type: 'state', name: d.state, count: 1 });
        }
        if (d.district && d.district.toLowerCase().includes(lowerQ)) {
            results.push({ type: 'district', name: d.district, state: d.state || '', count: 1 });
        }
        if (d.city && d.city.toLowerCase().includes(lowerQ)) {
            results.push({ type: 'city', name: d.city, state: d.state || '', district: d.district || '', count: 1 });
        }
        if ((d.location || '').toLowerCase().includes(lowerQ)) {
            results.push({ type: 'address', name: d.location, lat: d.latitude, lng: d.longitude, count: 1 });
        }
    });
    mockMapNGOs.forEach(n => {
        if (n.state && n.state.toLowerCase().includes(lowerQ)) {
            results.push({ type: 'state', name: n.state, count: 1 });
        }
        if (n.city && n.city.toLowerCase().includes(lowerQ)) {
            results.push({ type: 'city', name: n.city, state: n.state || '', district: '', count: 1 });
        }
    });

    // Deduplicate
    const unique = [];
    results.forEach(r => {
        const key = `${r.type}|${r.name}|${r.state || ''}`;
        if (!unique.some(u => `${u.type}|${u.name}|${u.state || ''}` === key)) {
            unique.push(r);
        }
    });

    // If no results in standby, try Nominatim
    if (unique.length === 0) {
        const coords = await geocodeAddress(q);
        if (coords) {
            unique.push({ type: 'address', name: q, lat: coords.lat, lng: coords.lng, count: 0 });
        }
    }

    res.json(unique.slice(0, 25));
};
