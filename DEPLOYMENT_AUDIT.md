# Deployment & Project Hygiene Master Plan

This document details all deployment configurations, containerization requirements, repository hygiene, and observability practices across the **Code-Buddi** project.

---

## Severity Levels

* **P0 - Critical**: Deploy blockers or fatal production runtime bugs (e.g., SPA routing broken on CDN/hosting platforms, lack of containerization/orchestration for multi-service stack).
* **P1 - High**: Repository branding/attribution mismatch, environment variable configuration hazards across microservices.
* **P2 - Medium**: Observability, structured logging, and APM error tracking.

---

## Master Issue Catalog

| # | Sev | Component & Location | Defect / Operational Issue | Remediation Blueprint |
|---|---|---|---|---|
| **D1** | **P0** | `.gitignore`<br>*(line 124)* | **Git-Ignored SPA Rewrite Configuration**: `.gitignore` ignores `vercel.json`. As a result, the rewrite rule required by Single Page Applications (React Router) cannot be committed. Direct navigation or browser refresh on routes like `/login`, `/register`, `/accounts` causes a `404 Not Found` on Vercel/Netlify. | Remove `vercel.json` from `.gitignore`. Add `vercel.json` with SPA rewrite rule (`"source": "/(.*)", "destination": "/index.html"`), and include a `Frontend/public/_redirects` fallback for Netlify. |
| **D2** | **P0** | Repository Root | **Missing Containerization, CI/CD, & Test Harness**: The project consists of 4 distinct services (React Frontend, Express Login, Flask Genai, Flask TempFile) plus MongoDB and Redis, but lacks `Dockerfile`s, `docker-compose.yml`, health check endpoints, CI test runners, or automated deployment scripts. | Create multi-stage `Dockerfile`s for each service, a root `docker-compose.yml` orchestrating all services with MongoDB & Redis, GitHub Actions CI workflow, and automated test commands. |
| **D3** | **P1** | `README.md`<br>*(lines 5, 105)* | **Stale Upstream Repository References**: Clone URL (`git clone https://github.com/gladw-in/online-ide.git`), SLOC badge, and metadata still reference the original upstream repo rather than `kishorm3795/Code-Buddi`. | Update repository links, clone commands, and badges to point to `kishorm3795/Code-Buddi`, while explicitly retaining MIT license attribution to the original author. |
| **D4** | **P1** | `.env.example`<br>*(Repository Root)* | **Monolithic Environment Template**: A single monolithic `.env.example` lists variables for 4 distinct environments in one file with hardcoded `localhost` endpoints, causing confusion during isolated service deployments (e.g. Docker, Railway, Render). | Decompose into service-scoped templates: `Frontend/.env.example`, `Backend/Login/.env.example`, `Backend/Genai/.env.example`, and `Backend/TempFile/.env.example`, with separate development and production guides. |
| **D5** | **P2** | `Backend/Login/`, `Backend/Genai/`, `Backend/TempFile/` | **Unstructured Console / Ad-Hoc Logging**: Services rely on unformatted `console.log` / `console.error` and default Python logging. Logs lack request tracing IDs, structured JSON payloads, and integrations with centralized monitoring or error trackers. | Introduce structured JSON logging (e.g., `pino` or `winston` for Node.js, `python-json-logger` for Flask) and configure Sentry / OpenTelemetry error tracking. |

---

## Detailed Remediation Blueprint

### D1: Fix SPA Rewrites & `.gitignore`
1. **Edit `.gitignore`**:
   Remove `vercel.json` from line 124 of `.gitignore`.
2. **Add `vercel.json` in Root or `Frontend/`**:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
3. **Add `Frontend/public/_redirects` (Netlify fallback)**:
```text
/*    /index.html   200
```

---

### D2: Containerization & Orchestration (`docker-compose.yml`)

#### Root `docker-compose.yml`
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7-jammy
    container_name: codebuddi-mongo
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine
    container_name: codebuddi-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend-login:
    build:
      context: ./Backend/Login
      dockerfile: Dockerfile
    container_name: codebuddi-login
    restart: unless-stopped
    environment:
      - PORT=5003
      - MONGO_URI=mongodb://mongodb:27017/codebuddi
      - NODE_ENV=production
    ports:
      - "5003:5003"
    depends_on:
      - mongodb

  backend-genai:
    build:
      context: ./Backend/Genai
      dockerfile: Dockerfile
    container_name: codebuddi-genai
    restart: unless-stopped
    ports:
      - "5001:5001"

  backend-tempfile:
    build:
      context: ./Backend/TempFile
      dockerfile: Dockerfile
    container_name: codebuddi-tempfile
    restart: unless-stopped
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    ports:
      - "5002:5002"
    depends_on:
      - redis

  frontend:
    build:
      context: ./Frontend
      dockerfile: Dockerfile
    container_name: codebuddi-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend-login
      - backend-genai
      - backend-tempfile

volumes:
  mongo_data:
  redis_data:
```

---

### D3: Update Repository Branding in `README.md`
* Update clone command:
```bash
git clone https://github.com/kishorm3795/Code-Buddi.git
```
* Update SLOC badge:
```markdown
![Lines of code](https://sloc.xyz/github/kishorm3795/Code-Buddi)
```
* Preserve MIT License attribution acknowledging the original author.

---

### D4: Modular Environment Configuration Files
* **`Frontend/.env.example`**:
```dotenv
VITE_BACKEND_API_URL=http://localhost:5003
VITE_GEMINI_API_URL=http://localhost:5001
VITE_TEMP_SHARE_URL=http://localhost:5002
VITE_RECAPTCHA_SITE_KEY=
VITE_GOOGLE_CLIENT_ID=
```
* **`Backend/Login/.env.example`**:
```dotenv
PORT=5003
MONGO_URI=mongodb://127.0.0.1:27017/codebuddi
JWT_SECRET=
RECAPTCHA_SECRET_KEY=
GOOGLE_CLIENT_ID=
OTP_EMAIL_SERVICE=gmail
OTP_EMAIL_USER=
OTP_EMAIL_PASS=
ALLOWED_ORIGINS=http://localhost:5173
```
* **`Backend/Genai/.env.example`**:
```dotenv
PORT=5001
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-pro
GEMINI_MODEL_1=gemini-2.5-flash
JWT_SECRET=
RECAPTCHA_SECRET_KEY=
ALLOWED_ORIGINS=http://localhost:5173
```
* **`Backend/TempFile/.env.example`**:
```dotenv
PORT=5002
TEMP_FILE_URL=http://localhost:5002
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_SSL=false
JWT_SECRET=
RECAPTCHA_SECRET_KEY=
ALLOWED_ORIGINS=http://localhost:5173
```

---

### D5: Structured JSON Logging & Error Tracking
* **Node.js (`Backend/Login`)**:
  Replace raw `console.log` with `pino` or `winston` exporting timestamped JSON with `requestId`, `userId`, `method`, and `status`.
* **Python (`Backend/Genai` & `Backend/TempFile`)**:
  Configure standard library `logging` with JSON formatting:
```python
import logging
import json
from datetime import datetime

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
        }
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_record)
```

---

## Remediation Progress Checklist

- [ ] **Phase 1: P0 Deployment Blockers**
  - [ ] D1: Unignore `vercel.json` in `.gitignore` and add SPA rewrite rules
  - [ ] D2: Add `Dockerfile`s and `docker-compose.yml` for multi-container orchestration
- [ ] **Phase 2: P1 Documentation & Configuration Isolation**
  - [ ] D3: Update `README.md` URLs and maintain proper MIT attribution
  - [ ] D4: Split monolithic `.env.example` into per-service `.env.example` files
- [ ] **Phase 3: P2 Observability & Logs**
  - [ ] D5: Implement structured JSON logging across Node.js and Flask backends
