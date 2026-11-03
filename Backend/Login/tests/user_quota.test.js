const test = require('node:test');
const assert = require('node:assert/strict');
const { EXECUTION_TIER_QUOTAS } = require('../config/constants');
const User = require('../models/User');

test('User Model execution tiers and quotas', async (t) => {
    await t.test('provides default execution tier of free and 100 quota', () => {
        const user = new User({
            username: 'tieruser1',
            email: 'tieruser1@example.com',
        });

        assert.equal(user.executionTier, 'free');
        assert.equal(EXECUTION_TIER_QUOTAS[user.executionTier], 100);
        assert.equal(user.customExecutionQuota, null);
    });

    await t.test('supports pro and unlimited execution tiers', () => {
        assert.equal(EXECUTION_TIER_QUOTAS.pro, 500);
        assert.equal(EXECUTION_TIER_QUOTAS.unlimited, 100000);

        const proUser = new User({
            username: 'prouser',
            email: 'prouser@example.com',
            executionTier: 'pro',
        });
        assert.equal(proUser.executionTier, 'pro');
    });
});
