const mongoose = require('mongoose');
const User = require('../models/User');

let connectionPromise = null;

const seedAdmin = async () => {
    try {
        const adminExists = await User.findOne({ role: 'Admin' });

        if (!adminExists) {
            if (!process.env.ADMIN_PASSWORD) {
                console.error(
                    'SECURITY ERROR: ADMIN_PASSWORD environment variable is not configured. Cannot seed admin account.'
                );
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

            console.log(
                'Default Admin seeded successfully. (admin@foodbridgeai.org) 🔑'
            );
        }
    } catch (error) {
        console.error(`Admin Seeding Error: ${error.message}`);
    }
};

const connectDB = async () => {
    if (!process.env.MONGO_URI) {
        console.error(
            'SECURITY ERROR: MONGO_URI environment variable is not configured'
        );

        throw new Error('MONGO_URI environment variable is required');
    }

    // Already connected
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    // Connection already in progress
    if (connectionPromise) {
        return connectionPromise;
    }

    connectionPromise = mongoose
        .connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000
        })
        .then(async () => {
            console.log(
                `MongoDB Connected: ${mongoose.connection.host} 🔌`
            );

            await seedAdmin();

            return mongoose.connection;
        })
        .catch(error => {
            connectionPromise = null;

            console.error(
                `MongoDB Connection Error: ${error.message}`
            );

            throw error;
        });

    return connectionPromise;
};

module.exports = connectDB;