const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('node:path');
const pino = require('pino');
require('dotenv').config();

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
});

const { validateEnv } = require('./config/envValidator');

// Validate environment variables on startup
validateEnv(logger);

const corsOptions = require('./config/corsOptions');
const { connectDB } = require('./config/db');
const { getHealth } = require('./controllers/healthController');
const apiRoutes = require('./routes/index');

const app = express();

app.set('trust proxy', 1);

// Requirement 6: helmet, CORS restricted to ALLOWED_ORIGINS, single JSON body parser with 200kb limit
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '200kb' }));

// Lightweight cookie parser middleware
app.use((req, res, next) => {
    req.cookies = {};
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        cookieHeader.split(';').forEach((cookie) => {
            const parts = cookie.split('=');
            if (parts.length >= 2) {
                const name = parts[0].trim();
                const value = decodeURIComponent(parts.slice(1).join('=').trim());
                req.cookies[name] = value;
            }
        });
    }
    next();
});

// Root & Health routes
app.get('/health', getHealth);
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates/index.html'));
});

// Mount modular API routes (/api/*)
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 5003;

async function startServer() {
    await connectDB();
    app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
    });
}

if (process.env.NODE_ENV !== 'test') {
    startServer();
}

module.exports = app;
