const notificationService = require('../services/notificationService');

// GET /api/notifications?email=user@example.com
exports.getNotifications = async (req, res) => {
    const { email, unread } = req.query;

    try {
        const Notification = require('../models/Notification');
        const query = {};
        if (email) query.userEmail = email;
        if (unread === 'true') query.isRead = false;

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(50);

        return res.json({
            success: true,
            count: notifications.length,
            unreadCount: notifications.filter(n => !n.isRead).length,
            data: notifications
        });
    } catch {
        // Standby mode fallback
        const all = notificationService.getStandbyNotifications(email);
        const filtered = unread === 'true' ? all.filter(n => !n.isRead) : all;
        return res.json({
            success: true,
            count: filtered.length,
            unreadCount: all.filter(n => !n.isRead).length,
            data: filtered,
            standbyMode: true
        });
    }
};

// PUT /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
    const { id } = req.params;

    try {
        const Notification = require('../models/Notification');
        const notif = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
        if (!notif) return res.status(404).json({ message: 'Notification not found' });
        return res.json({ success: true, data: notif });
    } catch {
        // Standby mode fallback
        const notif = notificationService.markStandbyRead(id);
        if (!notif) return res.status(404).json({ message: 'Notification not found (Standby)' });
        return res.json({ success: true, data: notif, standbyMode: true });
    }
};

// PUT /api/notifications/mark-all-read
exports.markAllRead = async (req, res) => {
    const { email } = req.body;
    try {
        const Notification = require('../models/Notification');
        await Notification.updateMany({ userEmail: email, isRead: false }, { isRead: true });
        return res.json({ success: true, message: 'All notifications marked as read.' });
    } catch {
        const all = notificationService.getStandbyNotifications(email);
        all.forEach(n => { n.isRead = true; });
        return res.json({ success: true, message: 'All notifications marked as read (Standby).', standbyMode: true });
    }
};

// POST /api/notifications/test  — for verification
exports.sendTestNotification = async (req, res) => {
    const { email, type } = req.body;
    try {
        const notif = await notificationService.sendNotification({
            userEmail: email || 'test@zerowaste.ai',
            title: '🧪 Test Notification',
            message: 'Phase 8 notification system is working correctly!',
            type: type || 'general',
            emailData: { donorName: 'Test User', ngoName: 'Test NGO', foodName: 'Test Food', quantity: 10 }
        });
        return res.status(201).json({ success: true, message: 'Test notification dispatched!', data: notif });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
