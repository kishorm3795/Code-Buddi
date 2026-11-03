import pytest
from quota import QuotaManager, MockRedisQuota


def test_mock_redis_daily_quota():
    mock_redis = MockRedisQuota()
    qm = QuotaManager(client=mock_redis)

    user_id = "test_user_123"
    limit = 5

    for i in range(1, limit + 1):
        allowed, remaining, ttl = qm.check_daily_quota(user_id, limit=limit)
        assert allowed is True
        assert remaining == limit - i

    # Next attempt should be blocked
    allowed, remaining, ttl = qm.check_daily_quota(user_id, limit=limit)
    assert allowed is False
    assert remaining == 0


def test_burst_rate_limiter():
    mock_redis = MockRedisQuota()
    qm = QuotaManager(client=mock_redis)

    user_id = "burst_user_456"
    burst_cap = 3

    assert qm.check_burst_limit(user_id, limit=burst_cap) is True
    assert qm.check_burst_limit(user_id, limit=burst_cap) is True
    assert qm.check_burst_limit(user_id, limit=burst_cap) is True
    # 4th burst should be throttled
    assert qm.check_burst_limit(user_id, limit=burst_cap) is False


def test_concurrency_lock():
    mock_redis = MockRedisQuota()
    qm = QuotaManager(client=mock_redis)

    user_id = "concurrent_user_789"
    max_concurrent = 2

    assert qm.acquire_concurrency_lock(user_id, max_concurrent=max_concurrent) is True
    assert qm.acquire_concurrency_lock(user_id, max_concurrent=max_concurrent) is True
    # 3rd parallel execution should be rejected
    assert qm.acquire_concurrency_lock(user_id, max_concurrent=max_concurrent) is False

    # Release one slot
    qm.release_concurrency_lock(user_id)
    assert qm.acquire_concurrency_lock(user_id, max_concurrent=max_concurrent) is True
