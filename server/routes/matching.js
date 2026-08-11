const express = require('express');
const { getRecommendations, assignDonation, getNGORecommendationScore } = require('../controllers/matchingController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Retrieve top recommended NGOs for a donation (Protected)
router.get('/donations/:id', protect, getRecommendations);

// Assign donation listing to a recommended NGO (Protected)
router.post('/assign', protect, assignDonation);

// Get recommendation metrics for a specific donation relative to current logged-in NGO (Protected)
router.get('/ngo-recommendations', protect, getNGORecommendationScore);

module.exports = router;
