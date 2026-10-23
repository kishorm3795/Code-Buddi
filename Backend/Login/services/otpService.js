const bcrypt = require('bcryptjs');
const { generateOtp } = require('../utils/otpGenerator');

async function createAndSaveOtp(user) {
    const rawOtp = generateOtp();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(rawOtp, salt);

    user.otp = hashedOtp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    user.otpAttempts = 0;
    await user.save();

    return rawOtp;
}

async function verifyAndConsumeOtp(user, candidateOtp) {
    if (!user.otp || !user.otpExpires) {
        return {
            valid: false,
            status: 400,
            msg: 'No OTP requested or OTP has expired',
        };
    }

    if (user.otpAttempts >= 5) {
        user.otp = null;
        user.otpExpires = null;
        user.otpAttempts = 0;
        await user.save();
        return {
            valid: false,
            status: 429,
            msg: 'Too many failed attempts. This OTP has been invalidated. Please request a new OTP.',
        };
    }

    if (user.otpExpires < Date.now()) {
        user.otp = null;
        user.otpExpires = null;
        user.otpAttempts = 0;
        await user.save();
        return {
            valid: false,
            status: 400,
            msg: 'OTP has expired',
        };
    }

    const isMatch = await bcrypt.compare(candidateOtp, user.otp);

    if (!isMatch) {
        user.otpAttempts = (user.otpAttempts || 0) + 1;
        if (user.otpAttempts >= 5) {
            user.otp = null;
            user.otpExpires = null;
            user.otpAttempts = 0;
            await user.save();
            return {
                valid: false,
                status: 429,
                msg: 'Too many failed attempts. This OTP has been invalidated. Please request a new OTP.',
            };
        }
        await user.save();
        return {
            valid: false,
            status: 400,
            msg: 'Invalid OTP',
        };
    }

    // Success - consume OTP
    user.otp = null;
    user.otpExpires = null;
    user.otpAttempts = 0;
    return {
        valid: true,
    };
}

module.exports = {
    createAndSaveOtp,
    verifyAndConsumeOtp,
};
