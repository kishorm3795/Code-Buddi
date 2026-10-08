const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const envOrigins = process.env.ALLOWED_ORIGINS
	? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
	: [];
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

const corsOptions = {
	origin: (origin, callback) => {
		// Allow requests with no origin (like curl, server-to-server, or same-origin)
		if (!origin) return callback(null, true);
		if (allowedOrigins.includes(origin)) {
			return callback(null, true);
		}
		return callback(new Error('Blocked by CORS: Origin not allowed'));
	},
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'x-recaptcha-token'],
	credentials: true,
};

module.exports = corsOptions;
