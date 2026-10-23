import os
import sys
import json
import uuid
import time
from pathlib import Path
import pytest
import jwt
import fakeredis
from unittest.mock import patch, MagicMock

# Ensure TempFile directory is in sys.path
tempfile_dir = Path(__file__).resolve().parent.parent
if 'utils' in sys.modules:
    del sys.modules['utils']
if 'app' in sys.modules:
    del sys.modules['app']
if str(tempfile_dir) in sys.path:
    sys.path.remove(str(tempfile_dir))
sys.path.insert(0, str(tempfile_dir))

os.environ["APP_ENV"] = "test"
os.environ["FLASK_ENV"] = "development"
os.environ["JWT_SECRET"] = "test_jwt_secret_tempfile_key_12345_67890_abcdefghijklmnopqrstuvwxyz_01234567890"

from app import app, MAX_UPLOAD_SIZE, ALLOWED_LANGUAGES, limiter
from utils import set_redis_client, reset_redis_connection


@pytest.fixture
def fake_redis():
    """Provides a clean in-memory FakeRedis instance for each test."""
    client = fakeredis.FakeRedis()
    set_redis_client(client)
    yield client
    client.flushall()
    reset_redis_connection()


@pytest.fixture
def client(fake_redis):
    """Provides a test Flask client configured with fakeredis."""
    app.config["TESTING"] = True
    app.config["RATELIMIT_ENABLED"] = False
    with app.test_client() as test_client:
        yield test_client


@pytest.fixture
def auth_headers():
    token = jwt.encode(
        {"userId": "owner_user_123"},
        os.environ["JWT_SECRET"],
        algorithm="HS512",
    )
    return {
        "Authorization": f"Bearer {token}",
        "X-Recaptcha-Token": "valid_token",
    }


@pytest.fixture
def other_user_headers():
    token = jwt.encode(
        {"userId": "attacker_user_999"},
        os.environ["JWT_SECRET"],
        algorithm="HS512",
    )
    return {
        "Authorization": f"Bearer {token}",
        "X-Recaptcha-Token": "valid_token",
    }


# ==========================================
# 1. Index & Health Route Tests
# ==========================================

def test_index_route(client):
    res = client.get("/")
    assert res.status_code == 200


def test_health_route_healthy(client, fake_redis):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert data["service"] == "tempfile"
    assert data["checks"]["redis_connection"]["healthy"] is True


def test_health_route_redis_down(client):
    with patch("app.get_redis_connection", return_value=None):
        res = client.get("/health")
        assert res.status_code == 503
        data = res.get_json()
        assert data["status"] == "unhealthy"
        assert data["checks"]["redis_connection"]["healthy"] is False


# ==========================================
# 2. Upload Route Tests
# ==========================================

@patch("app.is_human", return_value=True)
def test_upload_success(mock_is_human, client, fake_redis, auth_headers):
    payload = {
        "code": "print('hello world')",
        "language": "python",
        "title": "My Python Snippet",
        "expiryTime": 60,
    }
    res = client.post("/temp-file-upload", headers=auth_headers, json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["message"] == "Code uploaded successfully"
    assert "fileUrl" in data
    assert "expiry_time" in data
    assert "UTC" in data["expiry_time"]

    # Verify stored in fakeredis
    share_id = data["fileUrl"].split("/file/")[-1]
    redis_key = f"file:{share_id}:data"
    raw_saved = fake_redis.get(redis_key)
    assert raw_saved is not None

    saved_data = json.loads(raw_saved)
    assert saved_data["code"] == "print('hello world')"
    assert saved_data["language"] == "python"
    assert saved_data["title"] == "My Python Snippet"
    # Ownership: owner's userId MUST be stored in the record
    assert saved_data["userId"] == "owner_user_123"

    # Verify TTL set (60 minutes = 3600 seconds)
    ttl = fake_redis.ttl(redis_key)
    assert 3500 <= ttl <= 3600


@patch("app.is_human", return_value=True)
def test_upload_missing_fields(mock_is_human, client, auth_headers):
    res = client.post(
        "/temp-file-upload",
        headers=auth_headers,
        json={"code": "print('hello')"},
    )
    assert res.status_code == 400
    assert "required" in res.get_json()["error"]


@patch("app.is_human", return_value=True)
def test_upload_invalid_expiry_time(mock_is_human, client, auth_headers):
    payload = {
        "code": "print('hello')",
        "language": "python",
        "title": "Test Title",
        "expiryTime": 9999,  # invalid
    }
    res = client.post("/temp-file-upload", headers=auth_headers, json=payload)
    assert res.status_code == 400
    assert "Invalid expiry time" in res.get_json()["error"]


@patch("app.is_human", return_value=True)
def test_upload_invalid_language(mock_is_human, client, auth_headers):
    payload = {
        "code": "print('hello')",
        "language": "malicious_or_unknown_lang",
        "title": "Test Title",
        "expiryTime": 30,
    }
    res = client.post("/temp-file-upload", headers=auth_headers, json=payload)
    assert res.status_code == 400
    assert "Invalid language" in res.get_json()["error"]


@patch("app.is_human", return_value=True)
def test_upload_size_limit_exceeded(mock_is_human, client, auth_headers):
    oversized_code = "A" * (MAX_UPLOAD_SIZE + 10)
    payload = {
        "code": oversized_code,
        "language": "python",
        "title": "Large File",
        "expiryTime": 30,
    }
    res = client.post("/temp-file-upload", headers=auth_headers, json=payload)
    assert res.status_code == 413
    assert "0.5 MB limit" in res.get_json()["error"]


@patch("app.is_human", return_value=False)
def test_upload_recaptcha_failure(mock_is_human, client, auth_headers):
    payload = {
        "code": "print('hello')",
        "language": "python",
        "title": "Test",
        "expiryTime": 30,
    }
    res = client.post("/temp-file-upload", headers=auth_headers, json=payload)
    assert res.status_code == 403


def test_upload_redis_unreachable(client, auth_headers):
    with patch("app.is_human", return_value=True):
        with patch("app.get_redis_connection", return_value=None):
            payload = {
                "code": "print('hello')",
                "language": "python",
                "title": "Test",
                "expiryTime": 30,
            }
            res = client.post("/temp-file-upload", headers=auth_headers, json=payload)
            assert res.status_code == 503
            assert "Redis" in res.get_json()["error"]


# ==========================================
# 3. Read Route Tests (GET /file/<shareId>)
# ==========================================

def test_get_file_success_no_header_required(client, fake_redis):
    file_uuid = str(uuid.uuid4())
    share_id = f"python-{file_uuid}"
    snippet = {
        "title": "Snippet 1",
        "code": "print('reading works')",
        "language": "python",
        "expiry_time": "2026-10-23 12:00:00 UTC",
        "userId": "owner_user_123",
    }
    fake_redis.set(f"file:{share_id}:data", json.dumps(snippet), ex=300)

    # Note: NO X-File-ID header provided!
    res = client.get(f"/file/{share_id}")
    assert res.status_code == 200
    data = res.get_json()
    assert data["code"] == "print('reading works')"
    assert data["title"] == "Snippet 1"
    # Ensure Cache-Control: no-store is set
    assert res.headers.get("Cache-Control") == "no-store"


def test_get_file_invalid_format(client):
    # Missing uuid / no hyphen
    res = client.get("/file/invalidformatwithoutdash")
    assert res.status_code == 400

    # Invalid UUID structure
    res2 = client.get("/file/python-not-a-valid-uuid")
    assert res2.status_code == 400


def test_get_file_unknown_id_returns_404(client, fake_redis):
    random_uuid = str(uuid.uuid4())
    res = client.get(f"/file/python-{random_uuid}")
    assert res.status_code == 404
    assert res.get_json()["error"] == "File not found"


def test_get_file_unsupported_language_returns_400(client):
    random_uuid = str(uuid.uuid4())
    res = client.get(f"/file/brainfuck-{random_uuid}")
    assert res.status_code == 400


def test_get_file_expired_returns_410_or_404(client, fake_redis):
    file_uuid = str(uuid.uuid4())
    share_id = f"python-{file_uuid}"
    key = f"file:{share_id}:data"
    fake_redis.set(key, json.dumps({"code": "expired"}), ex=1)
    # Sleep past expiration in fakeredis
    time.sleep(1.1)

    res = client.get(f"/file/{share_id}")
    assert res.status_code in (404, 410)


def test_get_file_redis_unreachable(client):
    file_uuid = str(uuid.uuid4())
    with patch("app.get_redis_connection", return_value=None):
        res = client.get(f"/file/python-{file_uuid}")
        assert res.status_code == 503


# ==========================================
# 4. Delete Route Tests
# ==========================================

@patch("app.is_human", return_value=True)
def test_delete_by_owner_success(mock_is_human, client, fake_redis, auth_headers):
    file_uuid = str(uuid.uuid4())
    file_id = f"python-{file_uuid}"
    key = f"file:{file_id}:data"
    snippet = {
        "title": "Owner Snippet",
        "code": "x = 10",
        "language": "python",
        "userId": "owner_user_123",
    }
    fake_redis.set(key, json.dumps(snippet))

    res = client.delete(f"/file/{file_id}/delete", headers=auth_headers)
    assert res.status_code == 200
    assert res.get_json()["message"] == "File deleted successfully"
    assert fake_redis.get(key) is None


@patch("app.is_human", return_value=True)
def test_delete_by_different_user_returns_403(mock_is_human, client, fake_redis, other_user_headers):
    file_uuid = str(uuid.uuid4())
    file_id = f"python-{file_uuid}"
    key = f"file:{file_id}:data"
    snippet = {
        "title": "Owner Snippet",
        "code": "sensitive code",
        "language": "python",
        "userId": "owner_user_123",  # Owned by different user
    }
    fake_redis.set(key, json.dumps(snippet))

    # Attacker attempts delete
    res = client.delete(f"/file/{file_id}/delete", headers=other_user_headers)
    assert res.status_code == 403
    assert "not authorized" in res.get_json()["error"]
    # Ensure file was NOT deleted
    assert fake_redis.get(key) is not None


@patch("app.is_human", return_value=True)
def test_delete_non_existent_file_returns_404(mock_is_human, client, auth_headers):
    file_uuid = str(uuid.uuid4())
    res = client.delete(f"/file/python-{file_uuid}/delete", headers=auth_headers)
    assert res.status_code == 404
    assert res.get_json()["error"] == "File not found"


@patch("app.is_human", return_value=True)
def test_delete_invalid_format_returns_400(mock_is_human, client, auth_headers):
    res = client.delete("/file/invalidformat/delete", headers=auth_headers)
    assert res.status_code == 400


# ==========================================
# 5. Rate Limiting Tests
# ==========================================

def test_rate_limiting_enforced(fake_redis):
    app.config["TESTING"] = True
    app.config["RATELIMIT_ENABLED"] = True
    limiter.reset()

    with app.test_client() as test_client:
        file_uuid = str(uuid.uuid4())
        share_id = f"python-{file_uuid}"
        fake_redis.set(
            f"file:{share_id}:data",
            json.dumps({"title": "Test", "code": "pass", "language": "python"}),
        )

        statuses = []
        for _ in range(70):
            res = test_client.get(f"/file/{share_id}")
            statuses.append(res.status_code)

        # At 60 req/min limit, 429 must be triggered when exceeded
        assert 429 in statuses
