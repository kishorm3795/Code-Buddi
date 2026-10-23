process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_health_routes_supertest_key';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');

describe('Health and Static Routes', () => {
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

    it('GET / returns 200 and renders HTML', async () => {
        const res = await request(app).get('/');
        assert.equal(res.status, 200);
        assert.ok(res.text.includes('<!DOCTYPE html>') || res.text.includes('<html'));
    });

    it('GET /health returns 200 healthy when database is connected', async () => {
        const res = await request(app).get('/health');
        assert.equal(res.status, 200);
        assert.equal(res.body.status, 'healthy');
        assert.equal(res.body.database, 'connected');
    });

    it('GET /health returns 503 unhealthy when database is disconnected', async () => {
        await mongoose.disconnect();
        const res = await request(app).get('/health');
        assert.equal(res.status, 503);
        assert.equal(res.body.status, 'unhealthy');
        assert.equal(res.body.database, 'disconnected');

        // Reconnect for cleanup
        await mongoose.connect(mongod.getUri());
    });
});
