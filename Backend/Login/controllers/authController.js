const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken } = require('../utils/token');
const {
    usernameRegex,
    emailRegex,
    pwdRegex,
    reservedUsernames,
} = require('../utils/validation');
const { logUserAction } = require('../utils/useLogger');
const { sendOtpEmail } = require('../smtp/sendMail');
const { sendPassChangeEmail } = require('../smtp/passChanged');
const authService = require('../services/authService');
const {
    createAndSaveOtp,
    verifyAndConsumeOtp,
} = require('../services/otpService');
const { extractToken } = require('../middlewares/auth');

async function register(req, res) {
    const username = req.body.username?.trim();
    const email = req.body.email?.trim();
    const password = req.body.password;

    if (!username || !email || !password) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    if (!usernameRegex.test(username)) {
        return res.status(400).json({
            msg: 'Username must be 5-30 characters long and can only contain letters, numbers, underscores, dots, and hyphens.',
        });
    }

    if (reservedUsernames.includes(username.toLowerCase())) {
        return res.status(400).json({ msg: 'This username is reserved. Please choose another one.' });
    }

    if (!emailRegex.test(email)) {
        return res.status(400).json({ msg: 'Please provide a valid email address' });
    }

    if (password.length < 8 || !pwdRegex.test(password)) {
        return res.status(400).json({
            msg: 'Password must be at least 8 characters and contain only ASCII characters.',
        });
    }

    try {
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ msg: 'User with this email already exists' });
        }

        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ msg: 'Username is already taken' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            isEmailVerified: false,
        });

        const rawOtp = await createAndSaveOtp(newUser);
        await sendOtpEmail(email, rawOtp);

        return res.status(200).json({
            msg: 'Registration initiated. Please verify the OTP sent to your email.',
        });
    } catch (err) {
        console.error('Register error:', err);
        return res.status(500).json({ msg: 'Server error during registration' });
    }
}

async function login(req, res) {
    const email = req.body.email?.trim();
    const password = req.body.password;

    if (!email || !password) {
        return res.status(400).json({ msg: 'Email and password are required' });
    }

    if (!emailRegex.test(email)) {
        return res.status(400).json({ msg: 'Please enter a valid email address' });
    }

    if (password.length < 8 || !pwdRegex.test(password)) {
        return res.status(400).json({ msg: 'Invalid credentials' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            // Generic error message to prevent enumeration
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        if (user.googleId && !user.password) {
            return res.status(403).json({ msg: 'Login with Google' });
        }

        if (!user.isEmailVerified) {
            return res.status(400).json({ msg: 'Email not verified' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        user.lastLogin = new Date();
        await user.save();

        const token = signToken(user._id, user.tokenVersion || 0);
        authService.setTokenCookie(res, token);

        return res.status(200).json({
            token,
            username: user.username,
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
}

async function googleAuth(req, res) {
    const { token } = req.body;
    if (!token) {
        return res.status(401).json({ msg: 'Token is required' });
    }

    try {
        const payload = await authService.verifyGoogleIdToken(token);
        const { email, name, sub: googleId, email_verified } = payload;

        if (!email_verified) {
            return res.status(403).json({
                message: 'Google account email is not verified.',
            });
        }

        let user = await User.findOne({ email });

        if (!user) {
            const finalUsername = await authService.generateUniqueUsername(name);
            user = new User({
                username: finalUsername,
                email,
                googleId,
                isEmailVerified: true,
                lastLogin: new Date(),
            });
            await user.save();
        } else {
            user.lastLogin = new Date();
            if (!user.googleId) {
                user.googleId = googleId;
            }
            await user.save();
        }

        const appToken = signToken(user._id, user.tokenVersion || 0);
        authService.setTokenCookie(res, appToken);

        return res.status(200).json({
            message: 'Authentication successful!',
            token: appToken,
            username: user.username,
            isgoogleuser: true,
        });
    } catch (err) {
        console.error('Google auth error:', err);
        return res.status(401).json({ msg: 'Google token verification failed' });
    }
}

async function verifyOtp(req, res) {
    const email = req.body.email?.trim();
    const otp = req.body.otp?.trim();
    const password = req.body.password;

    if (!otp) {
        return res.status(400).json({ msg: 'OTP is required' });
    }

    if (password && (password.length < 8 || !pwdRegex.test(password))) {
        return res.status(400).json({
            msg: 'Password must be at least 8 characters and contain only ASCII characters.',
        });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid or expired OTP' });
        }

        if (user.googleId && !user.password) {
            return res.status(403).json({ msg: 'Login with Google' });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ msg: 'Email is already verified' });
        }

        const result = await verifyAndConsumeOtp(user, otp);
        if (!result.valid) {
            return res.status(result.status).json({ msg: result.msg });
        }

        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        user.isEmailVerified = true;
        user.lastLogin = new Date();
        await user.save();

        const token = signToken(user._id, user.tokenVersion || 0);
        authService.setTokenCookie(res, token);

        return res.status(200).json({
            token,
            username: user.username,
        });
    } catch (err) {
        console.error('Verify OTP error:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
}

async function resendOtp(req, res) {
    const email = req.body.email?.trim();
    if (!email) {
        return res.status(400).json({ msg: 'Email is required' });
    }

    try {
        const user = await User.findOne({ email });
        // Generic response that does not reveal if email exists
        const genericSuccess = { msg: 'If this email is registered, an OTP has been sent' };

        if (!user || (user.googleId && !user.password)) {
            return res.status(200).json(genericSuccess);
        }

        const rawOtp = await createAndSaveOtp(user);
        await sendOtpEmail(user.email, rawOtp);

        return res.status(200).json(genericSuccess);
    } catch (err) {
        console.error('Resend OTP error:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
}

async function forgotPassword(req, res) {
    const email = req.body.email?.trim();
    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ msg: 'Valid email is required' });
    }

    const genericMsg = 'If this email is registered, a password reset code has been sent.';

    try {
        const user = await User.findOne({ email });
        if (!user || (user.googleId && !user.password) || !user.isEmailVerified) {
            return res.status(200).json({ msg: genericMsg });
        }

        const rawOtp = await createAndSaveOtp(user);
        await sendOtpEmail(user.email, rawOtp);

        return res.status(200).json({ msg: genericMsg });
    } catch (err) {
        console.error('Forgot password error:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
}

async function resetPassword(req, res) {
    const email = req.body.email?.trim();
    const otp = req.body.otp?.trim();

    if (!otp) {
        return res.status(400).json({ msg: 'OTP is required' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user || (user.googleId && !user.password)) {
            return res.status(400).json({ msg: 'Invalid or expired OTP' });
        }

        if (user.otpAttempts >= 5) {
            user.otp = null;
            user.otpExpires = null;
            user.otpAttempts = 0;
            await user.save();
            return res.status(429).json({
                msg: 'Too many failed attempts. This OTP has been invalidated. Please request a new OTP.',
            });
        }

        if (user.otpExpires && user.otpExpires < Date.now()) {
            return res.status(400).json({ msg: 'OTP has expired' });
        }

        const isMatch = user.otp ? await bcrypt.compare(otp, user.otp) : false;
        if (!isMatch) {
            user.otpAttempts = (user.otpAttempts || 0) + 1;
            if (user.otpAttempts >= 5) {
                user.otp = null;
                user.otpExpires = null;
                user.otpAttempts = 0;
                await user.save();
                return res.status(429).json({
                    msg: 'Too many failed attempts. This OTP has been invalidated. Please request a new OTP.',
                });
            }
            await user.save();
            return res.status(400).json({ msg: 'Invalid OTP' });
        }

        return res.status(200).json({ msg: 'OTP verified successfully' });
    } catch (err) {
        console.error('Reset password error:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
}

async function updatePassword(req, res) {
    const email = req.body.email?.trim();
    const otp = req.body.otp?.trim();
    const newPassword = req.body.newPassword || req.body.password;

    if (!otp || !newPassword) {
        return res.status(400).json({ msg: 'OTP and new password are required' });
    }

    if (newPassword.length < 8 || !pwdRegex.test(newPassword)) {
        return res.status(400).json({
            msg: 'Password must be at least 8 characters and contain only ASCII characters.',
        });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid or expired OTP' });
        }

        const verifyResult = await verifyAndConsumeOtp(user, otp);
        if (!verifyResult.valid) {
            return res.status(verifyResult.status).json({ msg: verifyResult.msg });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all prior JWTs
        await user.save();

        try {
            await sendPassChangeEmail(user.email);
        } catch (mailErr) {
            console.error('Failed to send pass change email:', mailErr);
        }

        return res.status(200).json({ msg: 'Password updated successfully' });
    } catch (err) {
        console.error('Update password error:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
}

async function logout(req, res) {
    authService.clearTokenCookie(res);
    return res.status(200).json({ message: 'Logged out successfully' });
}

async function verifyToken(req, res) {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ valid: false, msg: 'No token provided' });
    }

    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS512'] });
        const user = await User.findById(decoded.userId).select('_id isEmailVerified tokenVersion');

        if (!user || !user.isEmailVerified) {
            return res.status(401).json({ valid: false, msg: 'User account not found or unverified' });
        }

        if (
            decoded.tokenVersion !== undefined &&
            user.tokenVersion !== undefined &&
            decoded.tokenVersion !== user.tokenVersion
        ) {
            return res.status(401).json({ valid: false, msg: 'Token has been invalidated' });
        }

        return res.status(200).json({ valid: true, userId: user._id });
    } catch (err) {
        return res.status(401).json({ valid: false, msg: 'Invalid or expired token' });
    }
}

async function checkEmailExists(req, res) {
    const email = req.body.email?.trim();
    if (!email) {
        return res.status(400).json({ msg: 'Email is required' });
    }
    try {
        const user = await User.findOne({ email });
        return res.status(200).json({ exists: !!user });
    } catch (err) {
        return res.status(500).json({ msg: 'Server error' });
    }
}

async function wrongEmail(req, res) {
    const email = req.body.email?.trim();
    if (!email) {
        return res.status(400).json({ msg: 'Email is required' });
    }
    try {
        const user = await User.findOne({ email });
        if (!user || user.isEmailVerified) {
            return res.status(400).json({ msg: 'Cannot delete verified user with this endpoint' });
        }
        await User.deleteOne({ _id: user._id });
        return res.status(200).json({ msg: 'Unverified registration cancelled' });
    } catch (err) {
        return res.status(500).json({ msg: 'Server error' });
    }
}

module.exports = {
    register,
    login,
    googleAuth,
    verifyOtp,
    resendOtp,
    forgotPassword,
    resetPassword,
    updatePassword,
    logout,
    verifyToken,
    checkEmailExists,
    wrongEmail,
};
