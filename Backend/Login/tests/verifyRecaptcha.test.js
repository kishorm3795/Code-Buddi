const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const { verifyRecaptcha } = require('../middlewares/verifyRecaptcha');

describe('verifyRecaptcha middleware', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...origEnv };
  });

  afterEach(() => {
    process.env = { ...origEnv };
    mock.reset();
  });

  it('skips verification in non-production when secret key is missing', async () => {
    delete process.env.RECAPTCHA_SECRET_KEY;
    process.env.NODE_ENV = 'development';

    const req = { headers: {} };
    let nextCalled = false;
    const res = {};
    const next = () => { nextCalled = true; };

    await verifyRecaptcha(req, res, next);
    assert.equal(nextCalled, true);
  });

  it('returns 500 in production when secret key is missing', async () => {
    delete process.env.RECAPTCHA_SECRET_KEY;
    process.env.NODE_ENV = 'production';

    const req = { headers: {} };
    let statusSet = null;
    let jsonBody = null;
    const res = {
      status(code) {
        statusSet = code;
        return {
          json(data) {
            jsonBody = data;
          },
        };
      },
    };
    const next = () => {};

    await verifyRecaptcha(req, res, next);
    assert.equal(statusSet, 500);
    assert.ok(jsonBody.msg.includes('secret key missing in production'));
  });

  it('returns 403 when token header is missing and secret is set', async () => {
    process.env.RECAPTCHA_SECRET_KEY = 'test_secret';

    const req = { headers: {} };
    let statusSet = null;
    let jsonBody = null;
    const res = {
      status(code) {
        statusSet = code;
        return {
          json(data) {
            jsonBody = data;
          },
        };
      },
    };
    const next = () => {};

    await verifyRecaptcha(req, res, next);
    assert.equal(statusSet, 403);
    assert.equal(jsonBody.msg, 'reCAPTCHA token is missing.');
  });

  it('calls next() when Google returns success and score >= 0.5', async () => {
    process.env.RECAPTCHA_SECRET_KEY = 'test_secret';

    mock.method(axios, 'post', async () => ({
      data: { success: true, score: 0.9 },
    }));

    const req = { headers: { 'x-recaptcha-token': 'valid_token' } };
    let nextCalled = false;
    const res = {};
    const next = () => { nextCalled = true; };

    await verifyRecaptcha(req, res, next);
    assert.equal(nextCalled, true);
  });

  it('returns 403 when score is less than 0.5', async () => {
    process.env.RECAPTCHA_SECRET_KEY = 'test_secret';

    mock.method(axios, 'post', async () => ({
      data: { success: true, score: 0.3 },
    }));

    const req = { headers: { 'x-recaptcha-token': 'low_score_token' } };
    let statusSet = null;
    let jsonBody = null;
    const res = {
      status(code) {
        statusSet = code;
        return {
          json(data) {
            jsonBody = data;
          },
        };
      },
    };
    const next = () => {};

    await verifyRecaptcha(req, res, next);
    assert.equal(statusSet, 403);
    assert.equal(jsonBody.msg, 'reCAPTCHA verification failed.');
  });

  it('returns 500 when network/axios throws an error', async () => {
    process.env.RECAPTCHA_SECRET_KEY = 'test_secret';

    mock.method(axios, 'post', async () => {
      throw new Error('Network timeout');
    });

    const req = { headers: { 'x-recaptcha-token': 'any_token' } };
    let statusSet = null;
    let jsonBody = null;
    const res = {
      status(code) {
        statusSet = code;
        return {
          json(data) {
            jsonBody = data;
          },
        };
      },
    };
    const next = () => {};

    await verifyRecaptcha(req, res, next);
    assert.equal(statusSet, 500);
    assert.equal(jsonBody.msg, 'Server error during reCAPTCHA verification.');
  });
});
