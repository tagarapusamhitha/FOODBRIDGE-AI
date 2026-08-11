const nodemailer = require('nodemailer');

// In-memory notification store for standby mode (when MongoDB is unavailable)
let standbyNotifications = [];
let notificationIdCounter = 1;

// ─── Email Transporter ────────────────────────────────────────────────────────
let transporter = null;

function getTransporter() {
    if (transporter) return transporter;
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
        transporter = nodemailer.createTransport({
            host,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: { user, pass }
        });
        console.log('✅ Email transporter initialized via', host);
    } else {
        console.log('📧 SMTP not configured — emails will be logged to stdout.');
    }
    return transporter;
}

// ─── Email Templates ──────────────────────────────────────────────────────────
const emailTemplates = {
    donation_accepted: (data) => ({
        subject: '🤝 Your Donation Has Been Accepted — FOODBRIDGE AI',
        html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#f9f9f9;border-radius:10px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,#10b981,#059669);padding:30px 20px;text-align:center;">
                    <h1 style="color:#fff;margin:0;font-size:24px;">🌱 FOODBRIDGE AI</h1>
                    <p style="color:#d1fae5;margin:8px 0 0;">Donation Status Update</p>
                </div>
                <div style="padding:30px 24px;">
                    <h2 style="color:#065f46;">🤝 Your Donation Was Accepted!</h2>
                    <p style="color:#374151;">Dear <strong>${data.donorName || 'Donor'}</strong>,</p>
                    <p style="color:#374151;">Great news! <strong>${data.ngoName || 'An NGO'}</strong> has accepted your food donation.</p>
                    <div style="background:#ecfdf5;border-left:4px solid #10b981;padding:16px;border-radius:6px;margin:20px 0;">
                        <p style="margin:4px 0;color:#065f46;"><strong>📦 Food:</strong> ${data.foodName || 'Food Donation'}</p>
                        <p style="margin:4px 0;color:#065f46;"><strong>🔢 Quantity:</strong> ${data.quantity || 'N/A'} kg</p>
                        <p style="margin:4px 0;color:#065f46;"><strong>🏢 NGO:</strong> ${data.ngoName || 'N/A'}</p>
                        <p style="margin:4px 0;color:#065f46;"><strong>📍 Area:</strong> ${data.ngoArea || 'N/A'}</p>
                    </div>
                    <p style="color:#374151;">They will be coordinating pickup soon. Thank you for making a difference! 🙏</p>
                </div>
                <div style="background:#f3f4f6;padding:16px;text-align:center;font-size:12px;color:#9ca3af;">
                    FOODBRIDGE AI &mdash; Fighting Food Waste, One Meal at a Time
                </div>
            </div>`
    }),

    pickup_started: (data) => ({
        subject: '🚚 Pickup Started — Your Food Is On Its Way!',
        html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
                <div style="background:linear-gradient(135deg,#3b82f6,#2563eb);padding:30px 20px;text-align:center;border-radius:10px 10px 0 0;">
                    <h1 style="color:#fff;margin:0;">🚚 Pickup In Progress</h1>
                </div>
                <div style="padding:30px 24px;background:#f9f9f9;">
                    <p>Dear <strong>${data.donorName || 'Donor'}</strong>,</p>
                    <p><strong>${data.ngoName}</strong> has started picking up your donation of <strong>${data.foodName}</strong>.</p>
                    <p style="color:#6b7280;font-size:14px;">Estimated delivery time: <strong>${data.eta || '30-60 minutes'}</strong></p>
                </div>
                <div style="background:#f3f4f6;padding:16px;text-align:center;font-size:12px;color:#9ca3af;">FOODBRIDGE AI</div>
            </div>`
    }),

    delivered: (data) => ({
        subject: '✅ Food Delivered Successfully — Thank You!',
        html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
                <div style="background:linear-gradient(135deg,#10b981,#047857);padding:30px 20px;text-align:center;border-radius:10px 10px 0 0;">
                    <h1 style="color:#fff;margin:0;">✅ Delivery Complete!</h1>
                </div>
                <div style="padding:30px 24px;background:#f9f9f9;">
                    <p>Dear <strong>${data.donorName || 'Donor'}</strong>,</p>
                    <p>🎉 <strong>${data.foodName}</strong> (${data.quantity || 'N/A'} kg) has been successfully delivered by <strong>${data.ngoName}</strong>!</p>
                    <div style="background:#ecfdf5;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
                        <p style="font-size:28px;margin:0;">🌍</p>
                        <p style="color:#065f46;font-weight:bold;">Environmental Impact</p>
                        <p style="color:#374151;">~${Math.round((data.quantity || 1) * 2.5)} kg CO₂ emissions prevented!</p>
                    </div>
                    <p>Thank you for your generosity. You just helped fight food waste!</p>
                </div>
                <div style="background:#f3f4f6;padding:16px;text-align:center;font-size:12px;color:#9ca3af;">FOODBRIDGE AI</div>
            </div>`
    }),

    new_donation_nearby: (data) => ({
        subject: '🍱 New Food Donation Available Nearby — FOODBRIDGE AI',
        html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
                <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:30px 20px;text-align:center;border-radius:10px 10px 0 0;">
                    <h1 style="color:#fff;margin:0;">🍱 New Donation Alert!</h1>
                </div>
                <div style="padding:30px 24px;background:#f9f9f9;">
                    <p>Dear <strong>${data.ngoName || 'NGO Partner'}</strong>,</p>
                    <p>A new food donation is available near your service area!</p>
                    <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:16px;border-radius:6px;margin:20px 0;">
                        <p style="margin:4px 0;"><strong>📦 Food:</strong> ${data.foodName}</p>
                        <p style="margin:4px 0;"><strong>🔢 Quantity:</strong> ${data.quantity} kg</p>
                        <p style="margin:4px 0;"><strong>📍 Location:</strong> ${data.location}</p>
                        <p style="margin:4px 0;"><strong>⏰ Expires:</strong> ${data.expiry}</p>
                        <p style="margin:4px 0;"><strong>🎯 AI Match Score:</strong> ${data.matchScore}%</p>
                    </div>
                    <p>Log in to the NGO dashboard to accept this donation.</p>
                </div>
                <div style="background:#f3f4f6;padding:16px;text-align:center;font-size:12px;color:#9ca3af;">FOODBRIDGE AI</div>
            </div>`
    }),

    ai_recommendation: (data) => ({
        subject: '🤖 AI Matching Complete — Recommendations Ready',
        html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
                <div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:30px 20px;text-align:center;border-radius:10px 10px 0 0;">
                    <h1 style="color:#fff;margin:0;">🤖 AI Recommendations Ready</h1>
                </div>
                <div style="padding:30px 24px;background:#f9f9f9;">
                    <p>The AI engine has matched your donation to the best available NGOs.</p>
                    <p><strong>Top Match:</strong> ${data.topNgo} with a score of <strong>${data.score}%</strong></p>
                    <p>Log in to your dashboard to view all recommendations and assign a pickup.</p>
                </div>
                <div style="background:#f3f4f6;padding:16px;text-align:center;font-size:12px;color:#9ca3af;">FOODBRIDGE AI</div>
            </div>`
    })
};

// ─── Core Notification Dispatcher ─────────────────────────────────────────────
async function sendNotification(options) {
    const {
        userEmail,
        userId,
        title,
        message,
        type = 'general',
        relatedDonationId = null,
        relatedNgoId = null,
        emailData = null
    } = options;

    // 1. Persist to database (or in-memory standby)
    let notification = null;
    try {
        const Notification = require('../models/Notification');
        notification = await Notification.create({
            userId,
            userEmail,
            title,
            message,
            type,
            relatedDonationId,
            relatedNgoId
        });
    } catch {
        // Standby mode: store in memory
        notification = {
            _id: `notif-${notificationIdCounter++}`,
            userId,
            userEmail,
            title,
            message,
            type,
            relatedDonationId,
            relatedNgoId,
            isRead: false,
            createdAt: new Date().toISOString()
        };
        standbyNotifications.push(notification);
    }

    // 2. Send email (if emailData provided)
    if (emailData && userEmail) {
        const tmpl = emailTemplates[type];
        if (tmpl) {
            const { subject, html } = tmpl(emailData);
            const t = getTransporter();
            if (t) {
                try {
                    await t.sendMail({
                        from: `"FOODBRIDGE AI" <${process.env.SMTP_USER}>`,
                        to: userEmail,
                        subject,
                        html
                    });
                    console.log(`📧 Email sent to ${userEmail}: ${subject}`);
                } catch (err) {
                    console.error('⚠️ Email send error:', err.message);
                }
            } else {
                // Log email to stdout (no SMTP configured)
                console.log('\n📧 ─────────── EMAIL (STDOUT LOG) ───────────');
                console.log(`   To: ${userEmail}`);
                console.log(`   Subject: ${subject}`);
                console.log(`   Type: ${type}`);
                console.log(`   Message: ${message}`);
                console.log('─────────────────────────────────────────────\n');
            }
        }
    }

    return notification;
}

// ─── Getters for standby mode ─────────────────────────────────────────────────
function getStandbyNotifications(userEmail) {
    if (userEmail) {
        return standbyNotifications.filter(n => n.userEmail === userEmail);
    }
    return standbyNotifications;
}

function markStandbyRead(notifId) {
    const notif = standbyNotifications.find(n => n._id === notifId);
    if (notif) notif.isRead = true;
    return notif;
}

function clearStandbyNotifications() {
    standbyNotifications = [];
}

module.exports = {
    sendNotification,
    getStandbyNotifications,
    markStandbyRead,
    clearStandbyNotifications
};
