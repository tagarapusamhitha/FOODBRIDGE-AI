


const mongoose = require('mongoose');
const User = require('../models/User');

const seedAdmin = async () => {
    try {
        const adminExists = await User.findOne({ role: 'Admin' });
        if (!adminExists) {
            if (!process.env.ADMIN_PASSWORD) {
                console.error('SECURITY ERROR: ADMIN_PASSWORD environment variable is not configured. Cannot seed admin account.');
                return;
            }
            console.log('Seeding default system Administrator account... 👤');
            await User.create({
                fullName: 'System Administrator',
                email: 'admin@foodbridgeai.org',
                password: process.env.ADMIN_PASSWORD,
                mobileNumber: '9999999999',
                role: 'Admin'
            });
            console.log('Default Admin seeded successfully. (admin@foodbridgeai.org) 🔑');
        }
    } catch (error) {
        console.error(`Admin Seeding Error: ${error.message}`);
    }
};

const connectDB = async () => {
    if (!process.env.MONGO_URI) {
        console.error('SECURITY ERROR: MONGO_URI environment variable is not configured');
        throw new Error('MONGO_URI environment variable is required');
    }
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000 // Timeout in 5 seconds
        });
        console.log(`MongoDB Connected: ${conn.connection.host} 🔌`);
        // Seed default admin immediately after connection
        await seedAdmin();
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        console.error('CRITICAL: MongoDB connection failed. Application cannot start without database.');
        throw error;
    }
};

module.exports = connectDB;
