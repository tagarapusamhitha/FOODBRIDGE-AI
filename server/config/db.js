const mongoose = require('mongoose');
const User = require('../models/User');

let connectionPromise = null;
let diagnosticsLogged = false;

const logConnectionDiagnostics = () => {
    if (diagnosticsLogged) return;
    diagnosticsLogged = true;

    const uri = process.env.MONGODB_URI || '';
    let uriShapeValid = false;
    try {
        const parsedUri = new URL(uri);
        uriShapeValid = parsedUri.protocol === 'mongodb:' || parsedUri.protocol === 'mongodb+srv:';
    } catch (error) {
        uriShapeValid = false;
    }

    console.log('MongoDB configuration diagnostics:', {
        uriExists: Boolean(uri),
        uriStartsWithMongoDBSrv: uri.startsWith('mongodb+srv://'),
        uriLength: uri.length,
        uriShapeValid,
        nodeEnvironment: process.env.NODE_ENV || 'undefined',
        vercelDetected: Boolean(process.env.VERCEL),
        vercelRegionConfigured: Boolean(process.env.VERCEL_REGION)
    });
};

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
    logConnectionDiagnostics();

    if (!process.env.MONGODB_URI) {
        console.error(
            'SECURITY ERROR: MONGODB_URI environment variable is not configured'
        );

        throw new Error('MONGODB_URI environment variable is required');
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
        .connect(process.env.MONGODB_URI, {
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