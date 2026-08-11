const express = require('express');
const { getMapDonations, getMapNGOs, getMapStates, getMapDistricts, getMapCities, searchLocations } = require('../controllers/mapController');

const router = express.Router();

// Public routes — no auth required for map display
router.get('/donations', getMapDonations);
router.get('/ngos', getMapNGOs);
router.get('/states', getMapStates);
router.get('/districts', getMapDistricts);
router.get('/cities', getMapCities);
router.get('/search', searchLocations);

module.exports = router;