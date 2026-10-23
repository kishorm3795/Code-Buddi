process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'super_secret_test_key_for_code_buddi_auth_user_routes_12345';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const { signToken } = require('../utils/token');

describe('User and Stats Routes Integration', () => {
    let mongod;
    let testUser;
    let otherUser;
    let authToken;
    let otherAuthToken;

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

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        testUser = new User({
            username: 'test_owner',
            email: 'owner@example.com',
            password: hashedPassword,
            isEmailVerified: true,
            tokenVersion: 0,
            sharedLinks: [
                {
                    shareId: 'python-owned123',
                    title: 'My Python Snippet',
                    expiryTime: new Date(Date.now() + 3600000),
                },
            ],
        });
        await testUser.save();
        authToken = signToken(testUser._id, 0);

        otherUser = new User({
            username: 'other_user',
            email: 'other@example.com',
            password: hashedPassword,
            isEmailVerified: true,
            tokenVersion: 0,
            sharedLinks: [
                {
                    shareId: 'js-foreign999',
                    title: 'Foreign Snippet',
                    expiryTime: new Date(Date.now() + 3600000),
                },
            ],
        });
        await otherUser.save();
        otherAuthToken = signToken(otherUser._id, 0);
    });

    describe('Authentication enforcement on stats and counter endpoints (Requirement 1)', () => {
        it('rejects POST /api/runCode/count when unauthenticated', async () => {
            const res = await request(app).post('/api/runCode/count').send({ language: 'python' });
            assert.equal(res.status, 401);
            assert.equal(res.body.msg, 'No token provided');
        });

        it('accepts POST /api/runCode/count with valid auth and increments counter', async () => {
            const res = await request(app)
                .post('/api/runCode/count')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ language: 'python' });

            assert.equal(res.status, 204);

            const updated = await User.findById(testUser._id);
            assert.equal(updated.runCodeCount.get('py'), 1);
        });

        it('rejects POST /api/generateCode/count when unauthenticated', async () => {
            const res = await request(app).post('/api/generateCode/count').send({ language: 'javascript' });
            assert.equal(res.status, 401);
        });

        it('accepts POST /api/generateCode/count with valid auth', async () => {
            const res = await request(app)
                .post('/api/generateCode/count')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ language: 'javascript' });
            assert.equal(res.status, 204);

            const updated = await User.findById(testUser._id);
            assert.equal(updated.generateCodeCount.get('js'), 1);
        });

        it('rejects POST /api/refactorCode/count when unauthenticated', async () => {
            const res = await request(app).post('/api/refactorCode/count').send({ language: 'cpp' });
            assert.equal(res.status, 401);
        });

        it('accepts POST /api/refactorCode/count with valid auth', async () => {
            const res = await request(app)
                .post('/api/refactorCode/count')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ language: 'cpp' });
            assert.equal(res.status, 204);

            const updated = await User.findById(testUser._id);
            assert.equal(updated.refactorCodeCount.get('cpp'), 1);
        });

        it('rejects POST /api/sharedLink/count when unauthenticated', async () => {
            const res = await request(app).post('/api/sharedLink/count').send({
                shareId: 'test-123',
                title: 'Test',
                expiryTime: 60,
            });
            assert.equal(res.status, 401);
        });

        it('accepts POST /api/sharedLink/count with valid auth', async () => {
            const res = await request(app)
                .post('/api/sharedLink/count')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    shareId: 'new-share-456',
                    title: 'New Snippet',
                    expiryTime: 60,
                });
            assert.equal(res.status, 204);

            const updated = await User.findById(testUser._id);
            assert.ok(updated.sharedLinks.some((l) => l.shareId === 'new-share-456'));
        });
    });

    describe('DELETE /api/sharedLink and /api/user/sharedLink/:shareId (Requirement 1: scope to owner)', () => {
        it('rejects unauthenticated requests to DELETE /api/sharedLink', async () => {
            const res = await request(app).delete('/api/sharedLink').send({ shareId: 'python-owned123' });
            assert.equal(res.status, 401);
        });

        it('rejects unauthenticated requests to DELETE /api/user/sharedLink/:shareId', async () => {
            const res = await request(app).delete('/api/user/sharedLink/python-owned123');
            assert.equal(res.status, 401);
        });

        it('refuses to delete a link belonging to another user via DELETE /api/sharedLink', async () => {
            // Attempt to delete otherUser's link using testUser's token
            const res = await request(app)
                .delete('/api/sharedLink')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ shareId: 'js-foreign999' });

            assert.equal(res.status, 404);
            assert.equal(res.body.msg, 'Shared link not found');

            // Verify foreign link was NOT deleted
            const foreignCheck = await User.findById(otherUser._id);
            assert.ok(foreignCheck.sharedLinks.some((l) => l.shareId === 'js-foreign999'));
        });

        it('refuses to delete a link belonging to another user via DELETE /api/user/sharedLink/:shareId', async () => {
            const res = await request(app)
                .delete('/api/user/sharedLink/js-foreign999')
                .set('Authorization', `Bearer ${authToken}`);

            assert.equal(res.status, 404);
            assert.equal(res.body.msg, 'Shared link not found');
        });

        it('successfully deletes own link via DELETE /api/sharedLink', async () => {
            const res = await request(app)
                .delete('/api/sharedLink')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ shareId: 'python-owned123' });

            assert.equal(res.status, 200);
            assert.equal(res.body.msg, 'Shared link deleted successfully');

            const updated = await User.findById(testUser._id);
            assert.equal(updated.sharedLinks.length, 0);
        });

        it('successfully deletes own link via DELETE /api/user/sharedLink/:shareId', async () => {
            const res = await request(app)
                .delete('/api/user/sharedLink/python-owned123')
                .set('Authorization', `Bearer ${authToken}`);

            assert.equal(res.status, 200);
            assert.equal(res.body.msg, 'Shared link deleted successfully');

            const updated = await User.findById(testUser._id);
            assert.equal(updated.sharedLinks.length, 0);
        });
    });

    describe('User Profile and Account Operations', () => {
        it('GET /api/protected returns user info when authenticated', async () => {
            const res = await request(app)
                .get('/api/protected')
                .set('Authorization', `Bearer ${authToken}`);

            assert.equal(res.status, 200);
            assert.equal(res.body.user.username, 'test_owner');
            assert.equal(res.body.user.email, 'owner@example.com');
        });

        it('POST /api/account-details returns account details when authenticated', async () => {
            const res = await request(app)
                .post('/api/account-details')
                .set('Authorization', `Bearer ${authToken}`);

            assert.equal(res.status, 200);
            assert.equal(res.body.user.username, 'test_owner');
            assert.ok(Array.isArray(res.body.user.sharedLinks));
        });

        it('PUT /api/change-username updates username', async () => {
            const res = await request(app)
                .put('/api/change-username')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ newUsername: 'new_unique_name' });

            assert.equal(res.status, 200);
            assert.equal(res.body.username, 'new_unique_name');

            const updated = await User.findById(testUser._id);
            assert.equal(updated.username, 'new_unique_name');
        });

        it('PUT /api/change-password updates password and invalidates old tokens (tokenVersion)', async () => {
            const res = await request(app)
                .put('/api/change-password')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    currentPassword: 'password123',
                    newPassword: 'newsecurepassword123',
                });

            assert.equal(res.status, 200);
            assert.equal(res.body.msg, 'Password changed successfully');

            const updated = await User.findById(testUser._id);
            assert.equal(updated.tokenVersion, 1);

            // Previous token (tokenVersion 0) must now be rejected
            const testOldToken = await request(app)
                .get('/api/verify-token')
                .set('Authorization', `Bearer ${authToken}`);

            assert.equal(testOldToken.status, 401);
            assert.equal(testOldToken.body.msg, 'Token has been invalidated');
        });

        it('POST /api/verify-password validates user password correctly', async () => {
            const resWrong = await request(app)
                .post('/api/verify-password')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ password: 'wrongpassword' });
            assert.equal(resWrong.status, 400);

            const resCorrect = await request(app)
                .post('/api/verify-password')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ password: 'password123' });
            assert.equal(resCorrect.status, 200);
        });

        it('DELETE /api/account deletes account with correct password', async () => {
            const res = await request(app)
                .delete('/api/account')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ password: 'password123' });

            assert.equal(res.status, 200);
            assert.equal(res.body.msg, 'Account deleted successfully');

            const check = await User.findById(testUser._id);
            assert.equal(check, null);
        });
    });
});
