const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyRecaptcha } = require('../middlewares/verifyRecaptcha');
const { authLimiter, otpLimiter } = require('../middlewares/rateLimiters');

router.post('/register', authLimiter, verifyRecaptcha, authController.register);
router.post('/login', authLimiter, verifyRecaptcha, authController.login);
router.post('/auth/google', verifyRecaptcha, authController.googleAuth);
router.post('/verify-otp', otpLimiter, verifyRecaptcha, authController.verifyOtp);
router.post('/resend-otp', otpLimiter, verifyRecaptcha, authController.resendOtp);
router.post('/forgot-password', authLimiter, verifyRecaptcha, authController.forgotPassword);
router.post('/reset-password', otpLimiter, verifyRecaptcha, authController.resetPassword);
router.post('/update-password', otpLimiter, verifyRecaptcha, authController.updatePassword);
router.post('/logout', authController.logout);
router.get('/verify-token', authController.verifyToken);
router.post('/check-email-exists', verifyRecaptcha, authController.checkEmailExists);
router.delete('/wrong-email', verifyRecaptcha, authController.wrongEmail);

module.exports = router;
