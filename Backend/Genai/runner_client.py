import os
import time
import logging
import requests
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

PISTON_URL = os.getenv("PISTON_URL", "http://piston:2000").rstrip("/")
DEFAULT_TIMEOUT_SECONDS = int(os.getenv("EXECUTION_TIMEOUT_SECONDS", "5"))
MAX_TIMEOUT_SECONDS = 10
MIN_TIMEOUT_SECONDS = 1


class RunnerError(Exception):
    """Base exception for code runner issues."""
    pass


class RunnerUnavailableError(RunnerError):
    """Raised when sandbox runner daemon is unreachable."""
    pass


class RunnerExecutionTimeoutError(RunnerError):
    """Raised when sandbox execution exceeds wall-clock timeout."""
    pass


class RunnerClient:
    """Client for communicating with the Piston/gVisor sandboxed code execution daemon."""

    def __init__(self, base_url: Optional[str] = None, session: Optional[requests.Session] = None):
        self.base_url = (base_url or PISTON_URL).rstrip("/")
        self.session = session or requests.Session()

    def check_health(self) -> Dict[str, Any]:
        """Verify runner daemon availability and package registry."""
        try:
            resp = self.session.get(f"{self.base_url}/api/v2/packages", timeout=3)
            resp.raise_for_status()
            packages = resp.json()
            return {"healthy": True, "packages_count": len(packages)}
        except Exception as e:
            logger.warning(f"Runner health check failed: {e}")
            return {"healthy": False, "error": str(e)}

    def execute(
        self,
        language: str,
        code: str,
        stdin: str = "",
        args: Optional[List[str]] = None,
        timeout_seconds: Optional[int] = None,
        runtime_version: str = "*",
        filename: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Execute arbitrary code inside the sandboxed container runner.
        
        Returns standardized execution metrics and outputs.
        """
        timeout = timeout_seconds or DEFAULT_TIMEOUT_SECONDS
        timeout = max(MIN_TIMEOUT_SECONDS, min(timeout, MAX_TIMEOUT_SECONDS))

        files = [
            {
                "content": code,
                **({"name": filename} if filename else {}),
            }
        ]

        payload = {
            "language": language,
            "version": runtime_version,
            "files": files,
            "stdin": stdin or "",
            "args": args or [],
            "run_timeout": timeout * 1000,
            "compile_timeout": 15000,
        }

        start_time = time.perf_counter()
        try:
            # We allow timeout + 3s buffer on HTTP socket to let Piston's internal watchdog trigger first
            resp = self.session.post(
                f"{self.base_url}/api/v2/execute",
                json=payload,
                timeout=timeout + 3.0,
            )
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)

            if resp.status_code == 400:
                err_data = resp.json() if resp.text else {}
                msg = err_data.get("message", "Invalid execution request")
                logger.warning(f"Runner bad request for language '{language}': {msg}")
                return {
                    "success": False,
                    "language": language,
                    "status": "error",
                    "error": msg,
                    "run": {
                        "stdout": "",
                        "stderr": msg,
                        "output": msg,
                        "exit_code": 1,
                        "signal": None,
                        "execution_time_ms": elapsed_ms,
                        "memory_kb": 0,
                    },
                }

            resp.raise_for_status()
            data = resp.json()
            return self._format_result(data, elapsed_ms, language)

        except (requests.ConnectionError, requests.ConnectTimeout) as e:
            logger.error(f"Cannot reach execution sandbox at {self.base_url}: {e}")
            raise RunnerUnavailableError(f"Code execution sandbox is temporarily offline: {e}")
        except requests.Timeout as e:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.warning(f"Execution hard timeout reached after {elapsed_ms}ms")
            return {
                "success": False,
                "language": language,
                "status": "time_limit_exceeded",
                "run": {
                    "stdout": "",
                    "stderr": f"Execution timed out after {timeout} seconds (SIGKILL).\n",
                    "output": f"Execution timed out after {timeout} seconds (SIGKILL).\n",
                    "exit_code": 137,
                    "signal": "SIGKILL",
                    "execution_time_ms": elapsed_ms,
                    "memory_kb": 0,
                },
            }
        except requests.RequestException as e:
            logger.error(f"Execution request failed: {e}")
            raise RunnerError(f"Execution request failed: {e}")

    def _format_result(self, raw: Dict[str, Any], elapsed_ms: int, language: str) -> Dict[str, Any]:
        """Normalize Piston execution output to Code-Buddi standard API structure."""
        run_info = raw.get("run", {})
        compile_info = raw.get("compile")

        stdout = run_info.get("stdout", "")
        stderr = run_info.get("stderr", "")
        output = run_info.get("output", "")
        exit_code = run_info.get("code", 0)
        signal = run_info.get("signal")

        # Determine status
        status = "success"
        if compile_info and compile_info.get("code", 0) != 0:
            status = "compile_error"
            stderr = compile_info.get("output", compile_info.get("stderr", stderr))
            exit_code = compile_info.get("code", 1)
        elif signal == "SIGKILL" or "timed out" in stderr.lower():
            status = "time_limit_exceeded"
        elif "out of memory" in stderr.lower() or "killed" in (stderr or "").lower() and exit_code == 137:
            status = "out_of_memory"
        elif exit_code != 0:
            status = "runtime_error"

        return {
            "success": status == "success",
            "language": language,
            "version": raw.get("version", "unknown"),
            "status": status,
            "run": {
                "stdout": stdout,
                "stderr": stderr,
                "output": output or (stdout + (f"\n{stderr}" if stderr else "")),
                "exit_code": exit_code,
                "signal": signal,
                "execution_time_ms": elapsed_ms,
                "memory_kb": 0, # Piston provides process exit stats; cgroup metrics enriched if available
            },
            "compile": compile_info,
        }


# Global singleton instance
runner_client = RunnerClient()
