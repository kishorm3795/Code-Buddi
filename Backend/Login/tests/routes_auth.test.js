process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'super_secret_test_key_for_code_buddi_auth_1234567890_abcdefghij';

const { describe, it, before, after, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const { signToken } = require('../utils/token');
const authService = require('../services/authService');

describe('Auth Routes Integration', () => {
    let mongod;

    before(async () => {
        mongod = await MongoMemoryServer.create();
        await mongoose.connect(mongod.getUri(), {
            serverSelectionTimeoutMS: 5000,
        });
    });

    after(async () => {
        await mongoose.disconnect();
        if (mongod) {
            await mongod.stop();
        }
    });

    beforeEach(async () => {
        await User.deleteMany({});
        mock.reset();
    });

    describe('POST /api/register', () => {
        it('rejects registration with missing fields', async () => {
            const res = await request(app).post('/api/register').send({});
            assert.equal(res.status, 400);
            assert.equal(res.body.msg, 'Please enter all fields');
        });

        it('rejects invalid username or email format', async () => {
            const res1 = await request(app).post('/api/register').send({
                username: 'abc', // too short
                email: 'test@example.com',
                password: 'password123',
            });
            assert.equal(res1.status, 400);

            const res2 = await request(app).post('/api/register').send({
                username: 'validuser',
                email: 'not-an-email',
                password: 'password123',
            });
            assert.equal(res2.status, 400);
        });

        it('registers unverified user and generates OTP', async () => {
            const res = await request(app).post('/api/register').send({
                username: 'john_doe',
                email: 'john@example.com',
                password: 'password123',
            });
            assert.equal(res.status, 200);
            assert.ok(res.body.msg.includes('verify the OTP'));

            const user = await User.findOne({ email: 'john@example.com' });
            assert.ok(user);
            assert.equal(user.isEmailVerified, false);
            assert.ok(user.otp);
            assert.equal(user.otpAttempts, 0);
        });

        it('rejects duplicate email and username', async () => {
            await request(app).post('/api/register').send({
                username: 'unique_user',
                email: 'unique@example.com',
                password: 'password123',
            });

            const resDupEmail = await request(app).post('/api/register').send({
                username: 'another_user',
                email: 'unique@example.com',
                password: 'password123',
            });
            assert.equal(resDupEmail.status, 400);
            assert.equal(resDupEmail.body.msg, 'User with this email already exists');
        });
    });

    describe('POST /api/verify-otp and OTP attempt limit', () => {
        it('enforces 5 wrong attempt invalidation limit', async () => {
            const salt = await bcrypt.genSalt(10);
            const hashedOtp = await bcrypt.hash('123456', salt);

            const user = new User({
                username: 'otp_tester',
                email: 'otp@example.com',
                password: 'initialpassword123',
                isEmailVerified: false,
                otp: hashedOtp,
                otpExpires: Date.now() + 600000,
                otpAttempts: 0,
            });
            await user.save();

            // 4 wrong attempts
            for (let i = 1; i <= 4; i++) {
                const res = await request(app).post('/api/verify-otp').send({
                    email: 'otp@example.com',
                    otp: '000000',
                    password: 'newpassword123',
                });
                assert.equal(res.status, 400);
                assert.equal(res.body.msg, 'Invalid OTP');
            }

            // 5th wrong attempt -> 429 and invalidation
            const res5 = await request(app).post('/api/verify-otp').send({
                email: 'otp@example.com',
                otp: '000000',
                password: 'newpassword123',
            });
            assert.equal(res5.status, 429);
            assert.ok(res5.body.msg.includes('invalidated'));

            const updatedUser = await User.findOne({ email: 'otp@example.com' });
            assert.equal(updatedUser.otp, null);
            assert.equal(updatedUser.otpExpires, null);
        });

        it('successfully verifies with correct OTP and logs in user', async () => {
            const salt = await bcrypt.genSalt(10);
            const hashedOtp = await bcrypt.hash('654321', salt);

            const user = new User({
                username: 'valid_otp_user',
                email: 'validotp@example.com',
                password: 'initialpassword123',
                isEmailVerified: false,
                otp: hashedOtp,
                otpExpires: Date.now() + 600000,
                otpAttempts: 0,
            });
            await user.save();

            const res = await request(app).post('/api/verify-otp').send({
                email: 'validotp@example.com',
                otp: '654321',
                password: 'brandnewpassword123',
            });
            assert.equal(res.status, 200);
            assert.ok(res.body.token);

            const verifiedUser = await User.findOne({ email: 'validotp@example.com' });
            assert.equal(verifiedUser.isEmailVerified, true);
            assert.equal(verifiedUser.otp, null);
        });
    });

    describe('POST /api/login and generic messages', () => {
        beforeEach(async () => {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('secretpass123', salt);
            const user = new User({
                username: 'active_user',
                email: 'active@example.com',
                password: hashedPassword,
                isEmailVerified: true,
                tokenVersion: 0,
            });
            await user.save();
        });

        it('returns generic "Invalid credentials" without revealing email nonexistence', async () => {
            const res = await request(app).post('/api/login').send({
                email: 'nonexistent@example.com',
                password: 'wrongpassword',
            });
            assert.equal(res.status, 400);
            assert.equal(res.body.msg, 'Invalid credentials');
        });

        it('returns generic "Invalid credentials" on wrong password', async () => {
            const res = await request(app).post('/api/login').send({
                email: 'active@example.com',
                password: 'wrongpassword123',
            });
            assert.equal(res.status, 400);
            assert.equal(res.body.msg, 'Invalid credentials');
        });

        it('successfully logs in verified user with cookie and token', async () => {
            const res = await request(app).post('/api/login').send({
                email: 'active@example.com',
                password: 'secretpass123',
            });
            assert.equal(res.status, 200);
            assert.ok(res.body.token);
            assert.equal(res.body.username, 'active_user');

            const cookieHeader = res.headers['set-cookie'];
            assert.ok(cookieHeader);
            assert.ok(cookieHeader[0].includes('token='));
        });
    });

    describe('POST /api/auth/google', () => {
        it('rejects request with missing token', async () => {
            const res = await request(app).post('/api/auth/google').send({});
            assert.equal(res.status, 401);
            assert.equal(res.body.msg, 'Token is required');
        });

        it('rejects Google payload when email_verified is not true', async () => {
            mock.method(authService, 'verifyGoogleIdToken', async () => ({
                email: 'unverified_google@example.com',
                name: 'Google User',
                sub: 'g_123',
                email_verified: false,
            }));

            const res = await request(app).post('/api/auth/google').send({
                token: 'mock_google_id_token',
            });
            assert.equal(res.status, 403);
            assert.equal(res.body.message, 'Google account email is not verified.');
        });

        it('accepts Google payload when email_verified is true', async () => {
            mock.method(authService, 'verifyGoogleIdToken', async () => ({
                email: 'verified_google@example.com',
                name: 'Google User',
                sub: 'g_456',
                email_verified: true,
            }));

            const res = await request(app).post('/api/auth/google').send({
                token: 'mock_google_id_token',
            });
            assert.equal(res.status, 200);
            assert.ok(res.body.token);
            assert.equal(res.body.isgoogleuser, true);

            const user = await User.findOne({ email: 'verified_google@example.com' });
            assert.ok(user);
            assert.equal(user.isEmailVerified, true);
        });
    });

    describe('Generic response on forgot-password & resend-otp', () => {
        it('returns generic response on forgot-password regardless of email presence', async () => {
            const res = await request(app).post('/api/forgot-password').send({
                email: 'does_not_exist@example.com',
            });
            assert.equal(res.status, 200);
            assert.equal(res.body.msg, 'If this email is registered, a password reset code has been sent.');
        });

        it('returns generic response on resend-otp regardless of email presence', async () => {
            const res = await request(app).post('/api/resend-otp').send({
                email: 'does_not_exist@example.com',
            });
            assert.equal(res.status, 200);
            assert.equal(res.body.msg, 'If this email is registered, an OTP has been sent');
        });
    });

    describe('Token verification and tokenVersion invalidation', () => {
        it('rejects token when tokenVersion has changed', async () => {
            const user = new User({
                username: 'tv_user',
                email: 'tv@example.com',
                password: 'password123',
                isEmailVerified: true,
                tokenVersion: 1,
            });
            await user.save();

            // Token issued with older tokenVersion 0
            const oldToken = signToken(user._id, 0);

            const res = await request(app)
                .get('/api/verify-token')
                .set('Authorization', `Bearer ${oldToken}`);

            assert.equal(res.status, 401);
            assert.equal(res.body.valid, false);
            assert.equal(res.body.msg, 'Token has been invalidated');

            // Token issued with matching tokenVersion 1
            const validToken = signToken(user._id, 1);
            const resValid = await request(app)
                .get('/api/verify-token')
                .set('Authorization', `Bearer ${validToken}`);

            assert.equal(resValid.status, 200);
            assert.equal(resValid.body.valid, true);
        });
    });

    describe('Logout', () => {
        it('clears token cookie and returns 200', async () => {
            const res = await request(app).post('/api/logout');
            assert.equal(res.status, 200);
            assert.equal(res.body.message, 'Logged out successfully');
            assert.ok(res.headers['set-cookie'][0].includes('token=;'));
        });
    });
});
