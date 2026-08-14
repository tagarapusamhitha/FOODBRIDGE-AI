const serverless = require('serverless-http');
const app = require('../server/server');

module.exports = (app);
module.exports = serverless(app);