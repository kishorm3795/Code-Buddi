const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { generateOtp } = require('../utils/otpGenerator');

describe('generateOtp', () => {
  it('generates a 6-digit numeric string', () => {
    const otp = generateOtp();
    assert.equal(typeof otp, 'string');
    assert.equal(otp.length, 6);
    assert.match(otp, /^\d{6}$/);

    const numericVal = parseInt(otp, 10);
    assert.ok(numericVal >= 100000 && numericVal <= 999999);
  });

  it('produces pseudo-random values on successive calls', () => {
    const otps = new Set();
    for (let i = 0; i < 20; i++) {
      otps.add(generateOtp());
    }
    // With 20 samples from 900,000 range, duplicates should be virtually zero
    assert.ok(otps.size >= 19);
  });
});
