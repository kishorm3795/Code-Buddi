const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  usernameRegex,
  emailRegex,
  pwdRegex,
  reservedUsernames,
  sanitizeUsername,
} = require('../utils/validation');

describe('validation utils', () => {
  describe('usernameRegex', () => {
    it('accepts valid usernames between 5 and 30 alphanumeric characters and allowed symbols', () => {
      assert.ok(usernameRegex.test('valid_user'));
      assert.ok(usernameRegex.test('john.doe'));
      assert.ok(usernameRegex.test('user-123'));
      assert.ok(usernameRegex.test('abcdef'));
    });

    it('rejects usernames that are too short or too long', () => {
      assert.equal(usernameRegex.test('abcd'), false); // 4 chars
      assert.equal(usernameRegex.test('a'.repeat(31)), false); // 31 chars
    });

    it('rejects invalid characters', () => {
      assert.equal(usernameRegex.test('user@name'), false);
      assert.equal(usernameRegex.test('user name'), false);
      assert.equal(usernameRegex.test('user!name'), false);
    });
  });

  describe('emailRegex', () => {
    it('validates standard email formats', () => {
      assert.ok(emailRegex.test('test@example.com'));
      assert.ok(emailRegex.test('user.name+tag@domain.co.uk'));
    });

    it('rejects invalid email formats', () => {
      assert.equal(emailRegex.test('plainaddress'), false);
      assert.equal(emailRegex.test('@missinguser.com'), false);
      assert.equal(emailRegex.test('user@'), false);
    });
  });

  describe('pwdRegex', () => {
    it('requires at least 8 characters', () => {
      assert.ok(pwdRegex.test('12345678'));
      assert.ok(pwdRegex.test('secure_pass_phrase'));
      assert.equal(pwdRegex.test('1234567'), false);
    });
  });

  describe('reservedUsernames', () => {
    it('contains common sensitive handles', () => {
      assert.ok(reservedUsernames.includes('admin'));
      assert.ok(reservedUsernames.includes('root'));
      assert.ok(reservedUsernames.includes('system'));
      assert.ok(reservedUsernames.includes('api'));
    });
  });

  describe('sanitizeUsername', () => {
    it('sanitizes spaces and invalid characters', () => {
      const sanitized = sanitizeUsername('john doe!');
      assert.ok(sanitized.startsWith('john_doe'));
    });

    it('prepends user_ if starting with non-letter', () => {
      const sanitized = sanitizeUsername('123tester');
      assert.ok(sanitized.startsWith('user_'));
    });

    it('replaces reserved usernames with user_<suffix>', () => {
      const sanitized = sanitizeUsername('admin');
      assert.ok(sanitized.startsWith('user_'));
      assert.notEqual(sanitized, 'admin');
    });
  });
});
