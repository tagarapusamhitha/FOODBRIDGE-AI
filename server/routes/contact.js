const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const contactController = require('../controllers/contactController');

// @route   POST /api/contact
// @desc    Submit contact form
// @access  Public
router.post('/', [
    body('name').not().isEmpty().withMessage('Please enter your name'),
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('subject').not().isEmpty().withMessage('Please enter a subject'),
    body('message').not().isEmpty().withMessage('Please enter your message')
], contactController.submitContact);

module.exports = router;