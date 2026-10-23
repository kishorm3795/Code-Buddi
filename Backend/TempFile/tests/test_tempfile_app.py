import os
import sys
import json
from pathlib import Path
import unittest
from unittest.mock import patch, MagicMock
import jwt

# Unload any previously imported 'utils' or 'app' from other services
tempfile_dir = Path(__file__).resolve().parent.parent
if 'utils' in sys.modules:
    del sys.modules['utils']
if 'app' in sys.modules:
    del sys.modules['app']
if str(tempfile_dir) in sys.path:
    sys.path.remove(str(tempfile_dir))
sys.path.insert(0, str(tempfile_dir))

# Set test environment
os.environ["FLASK_ENV"] = "development"
os.environ["JWT_SECRET"] = "test_jwt_secret_tempfile_key_12345_67890_abcdefghijklmnopqrstuvwxyz_01234567890"

from app import app
from utils import MockRedis


class TestTempFileApp(unittest.TestCase):
    """Integration and endpoint tests for TempFile service."""

    def setUp(self):
        self.app = app
        self.client = self.app.test_client()
        self.secret = os.environ["JWT_SECRET"]
        self.mock_redis = MockRedis()

        # Generate a valid token
        self.token = jwt.encode({"userId": "test_user_123"}, self.secret, algorithm="HS512")
        self.auth_headers = {
            "Authorization": f"Bearer {self.token}",
            "X-Recaptcha-Token": "test_recaptcha_token",
        }

    def test_index_route(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)

    def test_health_route(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["service"], "tempfile")

    @patch("app.is_human", return_value=True)
    @patch("app.get_redis_connection")
    def test_upload_missing_fields(self, mock_get_redis, mock_is_human):
        mock_get_redis.return_value = self.mock_redis
        res = self.client.post(
            "/temp-file-upload",
            headers=self.auth_headers,
            json={"code": "print('hello')"},
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("required", res.get_json()["error"])

    @patch("app.is_human", return_value=True)
    @patch("app.get_redis_connection")
    def test_upload_invalid_expiry_time(self, mock_get_redis, mock_is_human):
        mock_get_redis.return_value = self.mock_redis
        payload = {
            "code": "print('hello')",
            "language": "python",
            "title": "Test Title",
            "expiryTime": 9999,  # invalid
        }
        res = self.client.post(
            "/temp-file-upload",
            headers=self.auth_headers,
            json=payload,
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Invalid expiry time", res.get_json()["error"])

    @patch("app.is_human", return_value=True)
    @patch("app.get_redis_connection")
    def test_upload_success(self, mock_get_redis, mock_is_human):
        mock_get_redis.return_value = self.mock_redis
        payload = {
            "code": "print('hello world')",
            "language": "python",
            "title": "My Test Snippet",
            "expiryTime": 60,
        }
        res = self.client.post(
            "/temp-file-upload",
            headers=self.auth_headers,
            json=payload,
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["message"], "Code uploaded successfully")
        self.assertIn("fileUrl", data)
        self.assertIn("expiry_time", data)

    @patch("app.get_redis_connection")
    def test_get_file_header_mismatch_redirect(self, mock_get_redis):
        mock_get_redis.return_value = self.mock_redis
        res = self.client.get("/file/python-12345")
        # Should redirect to index when X-File-ID is missing or doesn't match
        self.assertEqual(res.status_code, 302)

    @patch("app.get_redis_connection")
    def test_get_file_invalid_format(self, mock_get_redis):
        mock_get_redis.return_value = self.mock_redis
        res = self.client.get(
            "/file/invalid_format_without_hyphen",
            headers={"X-File-ID": "invalid_format_without_hyphen"},
        )
        self.assertEqual(res.status_code, 400)

    @patch("app.get_redis_connection")
    def test_get_file_not_found(self, mock_get_redis):
        mock_get_redis.return_value = self.mock_redis
        res = self.client.get(
            "/file/python-missing123",
            headers={"X-File-ID": "python-missing123"},
        )
        self.assertEqual(res.status_code, 404)

    @patch("app.get_redis_connection")
    def test_get_file_success(self, mock_get_redis):
        mock_get_redis.return_value = self.mock_redis
        snippet = {
            "title": "Snippet 1",
            "code": "const x = 42;",
            "language": "javascript",
            "expiry_time": "2026-10-23 12:00:00 UTC",
            "userId": "test_user_123",
        }
        self.mock_redis.set("file:javascript-abc999:data", json.dumps(snippet))

        res = self.client.get(
            "/file/javascript-abc999",
            headers={"X-File-ID": "javascript-abc999"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["code"], "const x = 42;")
        self.assertEqual(data["title"], "Snippet 1")

    @patch("app.is_human", return_value=True)
    @patch("app.get_redis_connection")
    def test_delete_file_unauthorized_user(self, mock_get_redis, mock_is_human):
        mock_get_redis.return_value = self.mock_redis
        snippet = {
            "title": "Private Snippet",
            "code": "secret",
            "language": "python",
            "userId": "different_owner_999",
        }
        self.mock_redis.set("file:python-priv123:data", json.dumps(snippet))

        res = self.client.delete(
            "/file/python-priv123/delete",
            headers=self.auth_headers,
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("not authorized", res.get_json()["error"])

    @patch("app.is_human", return_value=True)
    @patch("app.get_redis_connection")
    def test_delete_file_success(self, mock_get_redis, mock_is_human):
        mock_get_redis.return_value = self.mock_redis
        snippet = {
            "title": "My Snippet",
            "code": "some code",
            "language": "python",
            "userId": "test_user_123",
        }
        self.mock_redis.set("file:python-del123:data", json.dumps(snippet))

        res = self.client.delete(
            "/file/python-del123/delete",
            headers=self.auth_headers,
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["message"], "File deleted successfully")
        self.assertIsNone(self.mock_redis.get("file:python-del123:data"))


if __name__ == "__main__":
    unittest.main()
