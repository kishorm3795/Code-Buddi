const mongoose = require('mongoose');

function getHealth(req, res) {
    const isConnected = mongoose.connection.readyState === 1;
    return res.status(isConnected ? 200 : 503).json({
        status: isConnected ? 'healthy' : 'unhealthy',
        database: isConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
    });
}

module.exports = { getHealth };
