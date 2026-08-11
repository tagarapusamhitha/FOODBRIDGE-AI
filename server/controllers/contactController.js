const Contact = require('../models/Contact');

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
exports.submitContact = async (req, res) => {
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { name, email, subject, message } = req.body;

    try {
        const contact = await Contact.create({
            name,
            email,
            subject,
            message
        });

        return res.status(201).json({
            message: 'Thank you for contacting us! We will get back to you soon.',
            contact: {
                id: contact._id,
                name: contact.name,
                email: contact.email,
                subject: contact.subject,
                message: contact.message,
                createdAt: contact.createdAt
            }
        });
    } catch (err) {
        console.error('Contact Form Error:', err.message);
        return res.status(500).json({ error: 'Server error submitting contact form' });
    }
};