import os
import json
import jwt
import pytest
from unittest.mock import patch
import utils
from app import app
from runner_client import RunnerUnavailableError

TEST_SECRET = "a" * 64
utils.SECRET_KEY = TEST_SECRET
os.environ["JWT_SECRET"] = TEST_SECRET


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def auth_header():
    token = jwt.encode({"userId": "test_dev_user", "tokenVersion": 0}, TEST_SECRET, algorithm="HS512")
    return {"Authorization": f"Bearer {token}"}


def test_execute_missing_code(client, auth_header):
    resp = client.post("/execute", json={"language": "python", "code": ""}, headers=auth_header)
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["error"]["code"] == "MISSING_CODE"


def test_execute_unsupported_language(client, auth_header):
    resp = client.post("/execute", json={"language": "brainfuck", "code": "+++"}, headers=auth_header)
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["error"]["code"] == "UNSUPPORTED_LANGUAGE"


def test_execute_success_sandboxed(client, auth_header):
    mock_run_result = {
        "success": True,
        "language": "python",
        "version": "3.12.0",
        "status": "success",
        "run": {
            "stdout": "Hello Code-Buddi!\n",
            "stderr": "",
            "output": "Hello Code-Buddi!\n",
            "exit_code": 0,
            "signal": None,
            "execution_time_ms": 42,
            "memory_kb": 12400,
        },
        "compile": None,
    }

    with patch("app.runner_client.execute", return_value=mock_run_result):
        resp = client.post(
            "/execute",
            json={"language": "python", "code": "print('Hello Code-Buddi!')"},
            headers=auth_header,
        )
        assert resp.status_code == 200
        assert resp.headers.get("X-AI-Simulated") == "false"
        assert resp.headers.get("X-Execution-Engine") == "piston-sandbox"
        data = resp.get_json()
        assert data["success"] is True
        assert data["run"]["stdout"] == "Hello Code-Buddi!\n"
        assert "quota" in data


def test_execute_runner_unavailable(client, auth_header):
    with patch("app.runner_client.execute", side_effect=RunnerUnavailableError("Sandbox offline")):
        resp = client.post(
            "/execute",
            json={"language": "python", "code": "print('test')"},
            headers=auth_header,
        )
        assert resp.status_code == 503
        data = resp.get_json()
        assert data["error"]["code"] == "SANDBOX_UNAVAILABLE"


def test_legacy_get_output_backward_compatibility(client, auth_header):
    mock_run_result = {
        "success": True,
        "language": "python",
        "version": "3.12.0",
        "status": "success",
        "run": {
            "stdout": "42\n",
            "stderr": "",
            "output": "42\n",
            "exit_code": 0,
            "signal": None,
            "execution_time_ms": 30,
            "memory_kb": 10000,
        },
        "compile": None,
    }

    with patch("app.runner_client.execute", return_value=mock_run_result):
        resp = client.post(
            "/get-output",
            json={"language": "python", "code": "print(42)"},
            headers=auth_header,
        )
        assert resp.status_code == 200
        assert resp.headers.get("X-AI-Simulated") == "false"
        assert "42" in resp.get_data(as_text=True)
