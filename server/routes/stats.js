const express = require('express');
const { getStats, getAnalytics } = require('../controllers/statsController');

const router = express.Router();

router.get('/', getStats);
router.get('/analytics', getAnalytics);

module.exports = router;
