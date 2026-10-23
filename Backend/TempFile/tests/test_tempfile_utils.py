import os
import sys
from pathlib import Path
import unittest
from unittest.mock import patch, MagicMock
import jwt
import fakeredis
import redis

# Unload any previously imported 'utils' from other services
tempfile_dir = Path(__file__).resolve().parent.parent
if 'utils' in sys.modules:
    del sys.modules['utils']
if str(tempfile_dir) in sys.path:
    sys.path.remove(str(tempfile_dir))
sys.path.insert(0, str(tempfile_dir))

from utils import (
    MockRedis,
    get_redis_connection,
    get_redis_pool,
    set_redis_client,
    reset_redis_connection,
    is_human,
    token_required,
)
from flask import Flask, jsonify, request


class TestMockRedis(unittest.TestCase):
    """Test MockRedis in-memory store for development."""

    def setUp(self):
        self.redis = MockRedis()

    def test_mock_redis_operations(self):
        self.assertTrue(self.redis.ping())
        self.redis.set("key1", "val1")
        self.assertEqual(self.redis.get("key1"), "val1")
        self.assertTrue(self.redis.exists("key1"))
        self.assertEqual(self.redis.ttl("key1"), 100)

        self.redis.setex("key2", 60, "val2")
        self.assertEqual(self.redis.get("key2"), "val2")

        self.redis.delete("key1")
        self.assertIsNone(self.redis.get("key1"))
        self.assertEqual(self.redis.ttl("nonexistent"), -2)


class TestGetRedisConnection(unittest.TestCase):
    """Test Redis connection resolver and production fail-closed behavior."""

    def setUp(self):
        reset_redis_connection()

    def tearDown(self):
        reset_redis_connection()

    @patch.dict(os.environ, {"APP_ENV": "development", "REDIS_HOST": ""}, clear=False)
    def test_get_redis_dev_returns_mock_when_no_host(self):
        reset_redis_connection()
        client = get_redis_connection()
        self.assertIsInstance(client, MockRedis)

    @patch.dict(os.environ, {"APP_ENV": "development", "REDIS_HOST": "localhost", "REDIS_PORT": "6399"}, clear=False)
    @patch("redis.Redis.ping", side_effect=redis.ConnectionError("Connection refused"))
    def test_get_redis_dev_falls_back_to_mock_on_error(self, mock_ping):
        reset_redis_connection()
        client = get_redis_connection()
        self.assertIsInstance(client, MockRedis)

    @patch.dict(os.environ, {"APP_ENV": "production", "REDIS_HOST": ""}, clear=False)
    def test_get_redis_prod_returns_none_when_missing(self):
        reset_redis_connection()
        client = get_redis_connection()
        self.assertIsNone(client)

    @patch.dict(os.environ, {"APP_ENV": "production", "REDIS_HOST": "redis.example.com"}, clear=False)
    @patch("redis.Redis.ping", side_effect=redis.ConnectionError("Connection refused"))
    def test_get_redis_prod_returns_none_on_error_no_fallback(self, mock_ping):
        reset_redis_connection()
        client = get_redis_connection()
        self.assertIsNone(client)


class TestRedisSSLAndPool(unittest.TestCase):
    """Test TLS configuration and shared connection pool."""

    def setUp(self):
        reset_redis_connection()

    def tearDown(self):
        reset_redis_connection()

    @patch.dict(os.environ, {"REDIS_HOST": "redis.internal", "REDIS_SSL": "true"}, clear=False)
    def test_redis_ssl_enabled(self):
        reset_redis_connection()
        pool = get_redis_pool()
        self.assertIsNotNone(pool)
        self.assertTrue(pool.connection_kwargs.get("ssl"))

    @patch.dict(os.environ, {"REDIS_HOST": "redis.internal", "REDIS_SSL": "false"}, clear=False)
    def test_redis_ssl_disabled(self):
        reset_redis_connection()
        pool = get_redis_pool()
        self.assertIsNotNone(pool)
        self.assertFalse(pool.connection_kwargs.get("ssl"))

    @patch.dict(os.environ, {"REDIS_HOST": "redis.internal"}, clear=False)
    def test_shared_connection_pool_reused(self):
        reset_redis_connection()
        pool1 = get_redis_pool()
        pool2 = get_redis_pool()
        self.assertIs(pool1, pool2)


class TestIsHuman(unittest.TestCase):
    """Test reCAPTCHA verification helper."""

    @patch.dict(os.environ, {"APP_ENV": "development", "RECAPTCHA_SECRET_KEY": ""}, clear=False)
    def test_is_human_dev_skip(self):
        with patch("utils.RECAPTCHA_SECRET_KEY", None):
            self.assertTrue(is_human("any_token"))

    @patch.dict(os.environ, {"APP_ENV": "production"}, clear=False)
    def test_is_human_prod_missing_key(self):
        with patch("utils.RECAPTCHA_SECRET_KEY", None):
            self.assertFalse(is_human("any_token"))

    def test_is_human_missing_token(self):
        with patch("utils.RECAPTCHA_SECRET_KEY", "test_secret"):
            self.assertFalse(is_human(None))
            self.assertFalse(is_human(""))

    @patch("requests.post")
    def test_is_human_success(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"success": True, "score": 0.9}
        mock_resp.raise_for_status = MagicMock()
        mock_post.return_value = mock_resp

        with patch("utils.RECAPTCHA_SECRET_KEY", "test_secret"):
            self.assertTrue(is_human("valid_recaptcha_token"))

    @patch("requests.post")
    def test_is_human_low_score(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"success": True, "score": 0.2}
        mock_resp.raise_for_status = MagicMock()
        mock_post.return_value = mock_resp

        with patch("utils.RECAPTCHA_SECRET_KEY", "test_secret"):
            self.assertFalse(is_human("low_score_token"))


class TestTokenRequired(unittest.TestCase):
    """Test token_required decorator."""

    def setUp(self):
        self.app = Flask(__name__)
        self.secret = "test_jwt_secret_tempfile_key_12345_67890_abcdefghijklmnopqrstuvwxyz_01234567890"

        @self.app.route("/protected")
        @token_required
        def protected():
            return jsonify({"status": "ok", "userId": request.user_data.get("userId")})

        self.client = self.app.test_client()
        self.fake_redis = fakeredis.FakeRedis()
        set_redis_client(self.fake_redis)

    def tearDown(self):
        self.fake_redis.flushall()
        reset_redis_connection()

    def test_missing_token(self):
        with patch("utils.SECRET_KEY", self.secret):
            res = self.client.get("/protected")
            self.assertEqual(res.status_code, 403)
            self.assertEqual(res.get_json()["message"], "Token is missing!")

    def test_invalid_token(self):
        with patch("utils.SECRET_KEY", self.secret):
            res = self.client.get("/protected", headers={"Authorization": "Bearer bad.token.here"})
            self.assertEqual(res.status_code, 401)
            self.assertEqual(res.get_json()["message"], "Invalid token!")

    def test_valid_bearer_token(self):
        token = jwt.encode({"userId": "user_456"}, self.secret, algorithm="HS512")
        with patch("utils.SECRET_KEY", self.secret):
            res = self.client.get("/protected", headers={"Authorization": f"Bearer {token}"})
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.get_json()["userId"], "user_456")

    def test_valid_cookie_token(self):
        token = jwt.encode({"userId": "user_789"}, self.secret, algorithm="HS512")
        with patch("utils.SECRET_KEY", self.secret):
            self.client.set_cookie("token", token)
            res = self.client.get("/protected")
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.get_json()["userId"], "user_789")

    def test_revoked_token_in_redis(self):
        token = jwt.encode({"userId": "user_revoked"}, self.secret, algorithm="HS512")
        # Mark token as revoked in fakeredis
        self.fake_redis.set(f"revoked_token:{token}", "1")

        with patch("utils.SECRET_KEY", self.secret):
            res = self.client.get("/protected", headers={"Authorization": f"Bearer {token}"})
            self.assertEqual(res.status_code, 401)
            self.assertEqual(res.get_json()["message"], "Token has been revoked!")


if __name__ == "__main__":
    unittest.main()
