const jwt = require('jsonwebtoken');
const User = require('../models/User');

const extractToken = (req) => {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }
    if (req.cookies && req.cookies.token) {
        return req.cookies.token;
    }
    return null;
};

const requireAuth = async (req, res, next) => {
    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({
            msg: 'No token provided',
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS512'] });
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                msg: 'User account not found',
            });
        }

        if (
            decoded.tokenVersion !== undefined &&
            user.tokenVersion !== undefined &&
            decoded.tokenVersion !== user.tokenVersion
        ) {
            return res.status(401).json({
                msg: 'Token has been invalidated. Please log in again.',
            });
        }

        req.user = user;
        req.userId = user._id.toString();
        next();
    } catch (err) {
        return res.status(401).json({
            msg: 'Invalid or expired token',
        });
    }
};

module.exports = { requireAuth, extractToken };
