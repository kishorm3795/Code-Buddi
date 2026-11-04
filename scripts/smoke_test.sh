#!/usr/bin/env bash
# ==============================================================================
# Code-Buddi - Production & Staging Services Smoke Test
# ==============================================================================
# Verifies that deployed microservices and frontend respond with HTTP 200 / healthy.
#
# Usage:
#   ./scripts/smoke_test.sh [LOGIN_URL] [GENAI_URL] [TEMPFILE_URL] [FRONTEND_URL]
#
# Example (Local Docker):
#   ./scripts/smoke_test.sh http://localhost:5003 http://localhost:5001 http://localhost:5002 http://localhost:5173
#
# Example (Render / Production):
#   ./scripts/smoke_test.sh https://codebuddi-login.onrender.com https://codebuddi-genai.onrender.com https://codebuddi-tempfile.onrender.com https://code-buddi.vercel.app
# ==============================================================================

set -uo pipefail

LOGIN_URL="${1:-${LOGIN_URL:-http://localhost:5003}}"
GENAI_URL="${2:-${GENAI_URL:-http://localhost:5001}}"
TEMPFILE_URL="${3:-${TEMPFILE_URL:-http://localhost:5002}}"
FRONTEND_URL="${4:-${FRONTEND_URL:-http://localhost:5173}}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================================${NC}"
echo -e "${CYAN}         Code-Buddi Service Health Smoke Test         ${NC}"
echo -e "${CYAN}======================================================${NC}"

FAILURES=0

check_endpoint() {
  local service_name="$1"
  local url="$2"
  local expected_status="${3:-200}"

  echo -n "Checking ${service_name} (${url})... "

  start_time=$(date +%s%N 2>/dev/null || python3 -c 'import time; print(int(time.time() * 1e9))')
  response=$(curl -s -w "\n%{http_code}" --max-time 10 "${url}" 2>/dev/null || echo -e "\n000")
  end_time=$(date +%s%N 2>/dev/null || python3 -c 'import time; print(int(time.time() * 1e9))')

  http_code=$(echo "${response}" | tail -n 1)
  body=$(echo "${response}" | sed '$d')

  latency_ms=$(( (end_time - start_time) / 1000000 ))

  if [[ "${http_code}" == "${expected_status}" ]]; then
    echo -e "${GREEN}✓ [HTTP ${http_code}] (${latency_ms}ms)${NC}"
  else
    echo -e "${RED}✗ [FAILED] Expected HTTP ${expected_status}, got ${http_code}${NC}"
    if [[ -n "${body}" ]]; then
      echo -e "   ${YELLOW}Response: ${body:0:150}${NC}"
    fi
    FAILURES=$((FAILURES + 1))
  fi
}

check_endpoint "Login Service (/health)"    "${LOGIN_URL}/health" 200
check_endpoint "GenAI Service (/health)"    "${GENAI_URL}/health" 200
check_endpoint "TempFile Service (/health)" "${TEMPFILE_URL}/health" 200
check_endpoint "Frontend Client (/)"        "${FRONTEND_URL}/" 200

echo -e "\n${CYAN}======================================================${NC}"
if [[ ${FAILURES} -eq 0 ]]; then
  echo -e "${GREEN}All services are HEALTHY! Production smoke test passed.${NC}"
  exit 0
else
  echo -e "${RED}${FAILURES} service health check(s) FAILED.${NC}"
  exit 1
fi
