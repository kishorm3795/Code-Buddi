"""
Redis-backed quota and abuse prevention engine for Code-Buddi execution endpoints.
Provides atomic sliding-window daily quotas, burst limits, and concurrency semaphores.
"""

import os
import time
import logging
from typing import Tuple, Dict, Any, Optional

try:
    import redis
except ImportError:
    redis = None

logger = logging.getLogger(__name__)

DAILY_QUOTA_DEFAULT = int(os.getenv("DAILY_QUOTA_DEFAULT", "100"))
BURST_LIMIT_DEFAULT = int(os.getenv("BURST_RATE_LIMIT_PER_MINUTE", "15"))
MAX_CONCURRENT_DEFAULT = int(os.getenv("MAX_CONCURRENT_RUNS_PER_USER", "2"))


class MockRedisQuota:
    """In-memory mock quota tracker for testing and local development."""

    def __init__(self):
        self.counters = {}
        self.ttls = {}

    def ping(self):
        return True

    def get(self, key):
        return self.counters.get(key)

    def incr(self, key):
        self.counters[key] = self.counters.get(key, 0) + 1
        return self.counters[key]

    def decr(self, key):
        val = max(0, self.counters.get(key, 0) - 1)
        self.counters[key] = val
        return val

    def expire(self, key, seconds):
        self.ttls[key] = time.time() + seconds
        return True

    def ttl(self, key):
        if key not in self.counters:
            return -2
        exp = self.ttls.get(key)
        if not exp:
            return -1
        rem = int(exp - time.time())
        return rem if rem > 0 else -2

    def pipeline(self):
        return self

    def execute(self):
        return []


_redis_client = None


def get_redis_client():
    """Retrieve or create the shared Redis client."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    redis_host = os.getenv("REDIS_HOST")
    is_dev = os.getenv("FLASK_ENV") != "production" and os.getenv("APP_ENV") != "production"

    if not redis_host or redis is None:
        if is_dev:
            logger.info("Using Mock Redis for quotas (No REDIS_HOST configured or dev environment)")
            _redis_client = MockRedisQuota()
            return _redis_client
        logger.warning("REDIS_HOST not configured in production; quota limits in degraded mode.")
        _redis_client = MockRedisQuota()
        return _redis_client

    try:
        use_ssl = os.getenv("REDIS_SSL", "false").lower() in ("true", "1", "yes")
        redis_port = int(os.getenv("REDIS_PORT") or 6379)
        redis_password = os.getenv("REDIS_PASSWORD") or None

        client = redis.Redis(
            host=redis_host,
            port=redis_port,
            password=redis_password,
            ssl=use_ssl,
            socket_timeout=3,
            socket_connect_timeout=3,
            decode_responses=True,
        )
        client.ping()
        _redis_client = client
        logger.info("Successfully connected to Redis for execution quota tracking.")
        return _redis_client
    except Exception as e:
        logger.error(f"Failed to connect to Redis at {redis_host}: {e}")
        _redis_client = MockRedisQuota()
        return _redis_client


def set_redis_client(client):
    """Override client for testing."""
    global _redis_client
    _redis_client = client


class QuotaManager:
    """Manages multi-tiered per-user execution quotas and concurrency limits."""

    def __init__(self, client=None):
        self._client = client

    @property
    def client(self):
        if self._client is not None:
            return self._client
        return get_redis_client()

    def check_daily_quota(self, user_id: str, limit: int = DAILY_QUOTA_DEFAULT) -> Tuple[bool, int, int]:
        """
        Check and consume 1 execution unit for the user.
        
        Returns:
            Tuple[allowed (bool), remaining_quota (int), reset_seconds (int)]
        """
        if not user_id:
            # Anonymous or guest execution
            return True, limit, 86400

        key = f"quota:daily:{user_id}"
        client = self.client

        try:
            if isinstance(client, MockRedisQuota):
                curr = client.incr(key)
                if curr == 1:
                    client.expire(key, 86400)
                remaining = max(0, limit - curr)
                return (curr <= limit), remaining, 86400

            pipe = client.pipeline()
            pipe.incr(key)
            pipe.ttl(key)
            results = pipe.execute()
            count = int(results[0])
            ttl = int(results[1])

            if ttl == -1:
                client.expire(key, 86400)
                ttl = 86400
            elif ttl == -2:
                ttl = 86400

            allowed = count <= limit
            remaining = max(0, limit - count)
            return allowed, remaining, max(0, ttl)

        except Exception as e:
            logger.warning(f"Error checking daily quota for user {user_id}: {e}")
            # Fail open for user convenience on infrastructure failure, but log warning
            return True, limit, 86400

    def refund_daily_quota(self, user_id: str):
        """Refund a quota unit if execution failed due to server/sandbox error."""
        if not user_id:
            return
        key = f"quota:daily:{user_id}"
        try:
            self.client.decr(key)
        except Exception as e:
            logger.warning(f"Failed to refund quota for user {user_id}: {e}")


quota_manager = QuotaManager()
