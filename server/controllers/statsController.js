const mongoose = require('mongoose');
const Donation = require('../models/Donation');
const User = require('../models/User');
const donationController = require('./donationController');

const isDBConnected = () => mongoose.connection.readyState === 1;

// @desc    Get system statistics
// @route   GET /api/stats
// @access  Public
exports.getStats = async (req, res) => {
    // --- DB MODE ---
    if (isDBConnected()) {
        try {
            const totalDonationsCount = await Donation.countDocuments();
            const totalNGOsCount = await User.countDocuments({ role: 'NGO' });

            const allDonations = await Donation.find();
            
            let peopleFed = 0;
            let foodSaved = 0;

            allDonations.forEach(d => {
                const match = d.quantity.match(/(\d+)/);
                const qtyNum = match ? parseInt(match[1]) : 10;
                if (d.quantity.toLowerCase().includes('kg')) {
                    foodSaved += qtyNum;
                    peopleFed += qtyNum * 2;
                } else if (d.quantity.toLowerCase().includes('plate') || d.quantity.toLowerCase().includes('meal') || d.quantity.toLowerCase().includes('pack')) {
                    peopleFed += qtyNum;
                    foodSaved += Math.round(qtyNum * 0.4);
                } else {
                    peopleFed += qtyNum;
                    foodSaved += Math.round(qtyNum * 0.5);
                }
            });

            return res.json({
                totalDonations: totalDonationsCount + 120,
                peopleFed: peopleFed + 450,
                ngosConnected: totalNGOsCount + 35,
                foodSaved: foodSaved + 890
            });
        } catch (err) {
            console.error('Get Stats Error:', err.message);
            return res.status(500).json({ error: 'Server error retrieving statistics' });
        }
    }

    // --- STANDBY IN-MEMORY MODE ---
    console.log('[STANDBY MODE] Processing stats in-memory');
    const mockList = donationController.getMockDonationsList();
    
    let peopleFed = 0;
    let foodSaved = 0;

    mockList.forEach(d => {
        const match = d.quantity.match(/(\d+)/);
        const qtyNum = match ? parseInt(match[1]) : 10;
        if (d.quantity.toLowerCase().includes('kg')) {
            foodSaved += qtyNum;
            peopleFed += qtyNum * 2;
        } else if (d.quantity.toLowerCase().includes('plate') || d.quantity.toLowerCase().includes('meal') || d.quantity.toLowerCase().includes('pack')) {
            peopleFed += qtyNum;
            foodSaved += Math.round(qtyNum * 0.4);
        } else {
            peopleFed += qtyNum;
            foodSaved += Math.round(qtyNum * 0.5);
        }
    });

    res.json({
        totalDonations: mockList.length + 118, // 120 baseline
        peopleFed: peopleFed + 370,
        ngosConnected: 35, // Static baseline for mockup in standby
        foodSaved: foodSaved + 810
    });
};

// @desc    Get detailed analytics data for Admin Dashboard Chart.js charts
// @route   GET /api/stats/analytics
// @access  Public
exports.getAnalytics = async (req, res) => {
    try {
        // ─── Monthly Donation Trends (last 12 months) ─────────────────────────
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        let monthlyData;
        if (isDBConnected()) {
            const raw = await Donation.aggregate([
                { $group: {
                    _id: { $month: '$createdAt' },
                    count: { $sum: 1 }
                }},
                { $sort: { _id: 1 } }
            ]);
            monthlyData = months.map((m, i) => {
                const found = raw.find(r => r._id === i + 1);
                return found ? found.count : 0;
            });
        } else {
            // Realistic mock data for standby mode
            monthlyData = [14, 22, 18, 31, 26, 42, 38, 47, 35, 52, 48, 61];
        }

        // ─── Food Category Breakdown ─────────────────────────────────────────
        let categoryData;
        if (isDBConnected()) {
            const cats = await Donation.aggregate([
                { $group: { _id: '$category', count: { $sum: 1 } } }
            ]);
            categoryData = {
                labels: cats.map(c => c._id || 'Uncategorised'),
                counts: cats.map(c => c.count)
            };
        } else {
            categoryData = {
                labels: ['Cooked Meals', 'Bakery & Bread', 'Fresh Produce', 'Packaged Food', 'Dairy', 'Other'],
                counts: [38, 22, 17, 14, 6, 3]
            };
        }

        // ─── Top NGOs by Pickups ─────────────────────────────────────────────
        let topNgos;
        if (isDBConnected()) {
            const raw = await Donation.aggregate([
                { $match: { status: { $in: ['picked up', 'delivered'] } } },
                { $group: { _id: '$claimedBy', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
                { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'ngo' } },
                { $unwind: { path: '$ngo', preserveNullAndEmptyArrays: true } }
            ]);
            topNgos = {
                labels: raw.map(r => (r.ngo && r.ngo.fullName) || 'Unknown NGO'),
                counts: raw.map(r => r.count)
            };
        } else {
            topNgos = {
                labels: ['Annapurna Trust', 'Youth Helping Hands', 'Save Food India', 'Robin Hood Army', 'No Food Waste'],
                counts: [47, 38, 29, 25, 19]
            };
        }

        // ─── Environmental Impact ─────────────────────────────────────────────
        // 1 kg saved = 2.5 kg CO2 prevented
        let envData;
        if (isDBConnected()) {
            const allDons = await Donation.find({ status: 'delivered' });
            let totalKg = 0;
            allDons.forEach(d => {
                const m = (d.quantity || '').match(/(\d+)/);
                totalKg += m ? parseInt(m[1]) : 5;
            });
            envData = {
                foodSavedKg: totalKg + 890,
                co2SavedKg: Math.round((totalKg + 890) * 2.5),
                mealsProvided: Math.round((totalKg + 890) * 3)
            };
        } else {
            envData = {
                foodSavedKg: 2340,
                co2SavedKg: 5850,
                mealsProvided: 7020
            };
        }

        // ─── Quarter Comparison (for bar chart) ──────────────────────────────
        const quarterLabels = ['Q1 (Jan–Mar)', 'Q2 (Apr–Jun)', 'Q3 (Jul–Sep)', 'Q4 (Oct–Dec)'];
        const quarterData   = [
            monthlyData[0] + monthlyData[1] + monthlyData[2],
            monthlyData[3] + monthlyData[4] + monthlyData[5],
            monthlyData[6] + monthlyData[7] + monthlyData[8],
            monthlyData[9] + monthlyData[10] + monthlyData[11]
        ];

        return res.json({
            success: true,
            monthlyTrends: { labels: months, data: monthlyData },
            foodCategories: categoryData,
            topNgos,
            environmental: envData,
            quarterlyComparison: { labels: quarterLabels, data: quarterData }
        });
    } catch (err) {
        console.error('Analytics Error:', err.message);
        return res.status(500).json({ success: false, message: 'Error generating analytics data.' });
    }
};

