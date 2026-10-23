import os
import sys
from pathlib import Path
import unittest
from unittest.mock import patch, MagicMock
import jwt

# Unload any previously imported 'utils' from other services
tempfile_dir = Path(__file__).resolve().parent.parent
if 'utils' in sys.modules:
    del sys.modules['utils']
if str(tempfile_dir) in sys.path:
    sys.path.remove(str(tempfile_dir))
sys.path.insert(0, str(tempfile_dir))

from utils import MockRedis, get_redis_connection, is_human, token_required
from flask import Flask, jsonify, request


class TestMockRedis(unittest.TestCase):
    """Test MockRedis in-memory store."""

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
    """Test Redis connection resolver."""

    @patch.dict(os.environ, {"FLASK_ENV": "development", "REDIS_HOST": ""}, clear=False)
    def test_get_redis_dev_returns_mock(self):
        client = get_redis_connection()
        self.assertIsInstance(client, MockRedis)

    @patch.dict(os.environ, {"FLASK_ENV": "production", "REDIS_HOST": ""}, clear=False)
    def test_get_redis_prod_returns_none_when_missing(self):
        client = get_redis_connection()
        self.assertIsNone(client)


class TestIsHuman(unittest.TestCase):
    """Test reCAPTCHA verification helper."""

    @patch.dict(os.environ, {"FLASK_ENV": "development", "RECAPTCHA_SECRET_KEY": ""}, clear=False)
    def test_is_human_dev_skip(self):
        with patch("utils.RECAPTCHA_SECRET_KEY", None):
            self.assertTrue(is_human("any_token"))

    @patch.dict(os.environ, {"FLASK_ENV": "production"}, clear=False)
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


if __name__ == "__main__":
    unittest.main()
