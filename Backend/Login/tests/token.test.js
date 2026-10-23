const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { generateToken } = require('../utils/token');

describe('generateToken (HS512 JWT)', () => {
  const originalSecret = process.env.JWT_SECRET;
  const testSecret = 'super_secret_test_key_for_code_buddi_auth_1234567890';

  beforeEach(() => {
    process.env.JWT_SECRET = testSecret;
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('generates a valid HS512 signed JWT containing userId', () => {
    const userId = 'user_abc_123';
    const token = generateToken(userId);

    assert.ok(typeof token === 'string' && token.length > 0);

    // Verify token with jsonwebtoken using HS512
    const decoded = jwt.verify(token, testSecret, { algorithms: ['HS512'] });
    assert.equal(decoded.userId, userId);
  });

  it('throws an error if JWT_SECRET is undefined', () => {
    delete process.env.JWT_SECRET;
    assert.throws(
      () => generateToken('user_abc_123'),
      /JWT_SECRET environment variable is not defined/
    );
  });

  it('supports custom expiration times', () => {
    const userId = 'user_abc_123';
    const token = generateToken(userId, '1h');
    const decoded = jwt.verify(token, testSecret, { algorithms: ['HS512'] });

    assert.equal(decoded.userId, userId);
    // Expiration should be within ~3600 seconds from issued-at
    assert.ok(decoded.exp - decoded.iat <= 3600);
    assert.ok(decoded.exp - decoded.iat >= 3590);
  });
});
