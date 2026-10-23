function getAllowedOrigins() {
    if (process.env.ALLOWED_ORIGINS) {
        return process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
    }
    if (process.env.NODE_ENV === 'production') {
        return [];
    }
    return [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost',
        'http://localhost:80',
        'http://127.0.0.1:80',
        'http://127.0.0.1',
    ];
}

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server, or same-origin)
        if (!origin) return callback(null, true);
        const allowed = getAllowedOrigins();
        if (allowed.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Blocked by CORS: Origin not allowed'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-recaptcha-token', 'x-prompt-version'],
    credentials: true,
};

module.exports = corsOptions;
