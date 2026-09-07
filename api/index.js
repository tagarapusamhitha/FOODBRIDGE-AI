const serverless = require('serverless-http');
const app = require('../server/server');
const connectDB = require('../server/config/db');

const handleRequest = serverless(app);

module.exports = async (req, res) => {
	try {
		await connectDB();
	} catch (error) {
		// The application retains its existing standby behavior if MongoDB is unavailable.
	}

	return handleRequest(req, res);
};