const express = require('express');
const { body } = require('express-validator');
const { createDonation, getDonations, claimDonation, getDonationHistory, updateDonationStatus } = require('../controllers/donationController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Publicly viewable active listings
router.get('/', getDonations);

// Create donation listing (Protected: Donors or Admin)
// location is optional if structured address fields are provided
router.post(
    '/',
    [
        protect,
        authorize('Donor', 'Admin'),
        body('foodName', 'Food name is required').notEmpty().trim(),
        body('quantity', 'Quantity details are required').notEmpty().trim(),
        body('location').optional({ values: 'falsy' }).trim(),
        body('address').optional({ values: 'falsy' }).trim(),
        body('city').optional({ values: 'falsy' }).trim(),
        body('district').optional({ values: 'falsy' }).trim(),
        body('state').optional({ values: 'falsy' }).trim(),
        body('pincode').optional({ values: 'falsy' }).trim(),
        body('category', 'Invalid food category').optional({ values: 'falsy' }).isIn(['Cooked Meals', 'Bakery & Bread', 'Fresh Produce', 'Packaged Food', 'Dairy', 'Other']),
        body('latitude', 'Invalid latitude').optional({ values: 'falsy', nullable: true }).isFloat({ min: -90, max: 90 }),
        body('longitude', 'Invalid longitude').optional({ values: 'falsy', nullable: true }).isFloat({ min: -180, max: 180 })
    ],
    createDonation
);

// Claim donation (Protected: NGOs or Admin)
router.post('/claim', protect, authorize('NGO', 'Admin'), claimDonation);

// Update donation status (Protected: NGOs or Admin)
router.put('/:id/status', protect, authorize('NGO', 'Admin'), updateDonationStatus);

// Get user donation history (Protected)
router.get('/history', protect, getDonationHistory);

module.exports = router;