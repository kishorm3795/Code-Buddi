const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { signToken } = require('../utils/token');
const { sanitizeUsername, reservedUsernames } = require('../utils/validation');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const setTokenCookie = (res, token) => {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
    });
};

const clearTokenCookie = (res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        path: '/',
    });
};

async function verifyGoogleIdToken(token) {
    const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
}

async function generateUniqueUsername(name) {
    let baseUsername = sanitizeUsername(name);
    let finalUsername = baseUsername;
    let tries = 0;

    while (
        (await User.exists({ username: finalUsername })) ||
        reservedUsernames.includes(finalUsername)
    ) {
        const randomSuffix = Math.random().toString(36).substring(2, 6);
        finalUsername = `${baseUsername}_${randomSuffix}`;
        tries++;
        if (tries > 10) {
            throw new Error('Unable to generate unique username.');
        }
    }

    return finalUsername;
}

module.exports = {
    setTokenCookie,
    clearTokenCookie,
    verifyGoogleIdToken,
    generateUniqueUsername,
};
