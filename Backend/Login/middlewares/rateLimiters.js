const rateLimit = require('express-rate-limit');

const getIpAndEmailKey = (req) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : '';
    return email ? `${ip}_${email}` : ip;
};

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getIpAndEmailKey,
    validate: false,
    message: { msg: 'Too many requests, please try again after 15 minutes' },
});

const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getIpAndEmailKey,
    validate: false,
    message: { msg: 'Too many attempts, please try again after 15 minutes' },
});

module.exports = {
    authLimiter,
    otpLimiter,
    getIpAndEmailKey,
};
