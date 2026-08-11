const express = require('express');
const router = express.Router();
const notifController = require('../controllers/notificationController');

// GET /api/notifications?email=user@example.com&unread=true
router.get('/', notifController.getNotifications);

// PUT /api/notifications/mark-all-read
router.put('/mark-all-read', notifController.markAllRead);

// PUT /api/notifications/:id/read
router.put('/:id/read', notifController.markAsRead);

// POST /api/notifications/test  — Verification endpoint
router.post('/test', notifController.sendTestNotification);

module.exports = router;
