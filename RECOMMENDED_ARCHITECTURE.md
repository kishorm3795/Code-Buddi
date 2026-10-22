# Code-Buddi Recommended Production Architecture

This document defines the unified API gateway, path-based routing, authentication lifecycle, and production resilience standards for the **Code-Buddi** platform.

---

## 1. Architecture Topology

```
Browser Client (React 19 + Vite 7, Static Hosting + CDN)
   |
   | HTTPS, reCAPTCHA v3 Token Header (`X-Recaptcha-Token`), JWT (`httpOnly` Cookie)
   v
API Gateway / Reverse Proxy (Nginx / Caddy / Host Router on Port 80/443)
   |
   +-- /api/*    -> Login Service (Node.js/Express :5003)      -> MongoDB Atlas
   |
   +-- /ai/*     -> GenAI Service (Flask/gunicorn :5001)       -> Google Gemini API
   |
   +-- /share/*  -> TempFile Service (Flask/gunicorn :5002)    -> Redis (TLS)
   |
   +-- /*        -> Static Frontend SPA (HTML5 PushState Router)

Shared Infrastructure:
   - High-entropy JWT Secret (HS512) shared across services
   - Rate limiting & token revocation via Redis
   - Structured JSON logs -> Centralized logging / Sentry
   - Uniform Health Checks (`/health` on backends, `/healthz` on gateway)
```

```mermaid
flowchart TD
    subgraph Client["Browser Client (Single Origin)"]
        SPA["React 19 + Vite SPA<br/>(One Base URL)"]
        Cookie["httpOnly Cookie (JWT)"]
        Recaptcha["reCAPTCHA v3 Header"]
    end

    subgraph Gateway["API Gateway / Reverse Proxy (Port 80/443)"]
        Nginx["Nginx / Caddy / Cloud Router"]
        HealthZ["/healthz Endpoint"]
    end

    subgraph Services["Backend Microservices"]
        Login["Login Service (Node.js/Express :5003)<br/>Issues JWT, Manages Users"]
        GenAI["GenAI Service (Flask/Gunicorn :5001)<br/>Prompt Registry, Code Gen/Exec"]
        TempFile["TempFile Service (Flask/Gunicorn :5002)<br/>Temporary Shared Snippets"]
    end

    subgraph Data["Data Stores & External APIs"]
        Mongo[("MongoDB Atlas<br/>Users & Shared Links")]
        RedisStore[("Managed Redis (TLS)<br/>Snippets, Rate Limits, Revocation")]
        Gemini["Google Gemini 2.5 API<br/>LLM Inference"]
    end

    SPA -->|HTTPS / Single Base URL| Nginx
    Cookie -.->|Sent Automatically| Nginx
    Recaptcha -.->|Attached on Mutations| Nginx

    Nginx -->|/api/*| Login
    Nginx -->|/ai/* (Unbuffered SSE)| GenAI
    Nginx -->|/share/*| TempFile
    Nginx -->|/*| SPA

    Login --> Mongo
    GenAI --> Gemini
    TempFile --> RedisStore
```

---

## 2. Core Rules of This Architecture

### Rule 1: Token Issuance vs. Verification Authority
* **Only the Login service issues JWT tokens**:
  - Implemented via `generateToken(userId)` in `Backend/Login/utils/token.js` with cryptographic HS512 signing and 7-day expiration.
  - Upon successful `/api/login`, `/api/register`, `/api/verify-otp`, or `/api/auth/google`, Login service sets an `httpOnly`, `Secure` (in production), `SameSite=Strict` cookie (`token`) on the response.
  - A dedicated `/api/logout` endpoint clears the `token` cookie.
* **Flask services only verify tokens**:
  - `Backend/Genai` and `Backend/TempFile` never issue or sign tokens.
  - The `@token_required` decorator decodes and verifies the cryptographic signature against `JWT_SECRET`.
  - Supports dual extraction: inspects `request.cookies.get("token")` as first-class citizen, with fallback to `Authorization: Bearer <token>`.

### Rule 2: State-Changing and Paid Endpoint Protection
* **Every state-changing or quota-consuming endpoint requires BOTH valid JWT and reCAPTCHA**:
  - **GenAI Quota Endpoints** (Burning Gemini Tokens):
    - `/ai/generate_code`: `@token_required` + `is_human(token)`
    - `/ai/get-output`: `@token_required` + `is_human(token)`
    - `/ai/refactor_code`: `@token_required` + `is_human(token)`
    - `/ai/improve-prompt`: `@token_required` + `is_human(token)`
    - `/ai/htmlcssjsgenerate-code`: `@token_required` + `is_human(token)`
    - `/ai/htmlcssjsrefactor-code`: `@token_required` + `is_human(token)`
  - **TempFile Mutation Endpoints**:
    - `/share/temp-file-upload`: `@token_required` + `is_human(token)`
    - `/share/file/<id>/delete`: `@token_required` + `is_human(token)` + ownership verification
  - **Login Service Mutation Endpoints**:
    - `/api/runCode/count`, `/api/saveSharedLink`, `/api/user/sharedLink/:id`, `/api/user` (delete account), `/api/change-password`: All require valid JWT + reCAPTCHA.

### Rule 3: No In-Memory Fallbacks in Production (Fail Loudly)
* **Zero Silent Fallbacks**:
  - In production (`FLASK_ENV=production` or `NODE_ENV=production`), missing critical configurations (`JWT_SECRET`, `RECAPTCHA_SECRET_KEY`, `REDIS_HOST`, `MONGO_URI`) trigger immediate fatal errors (`RuntimeError` or `process.exit(1)`) during startup.
  - `MockRedis` is strictly restricted to development environments. In production, `get_redis_connection()` checks `isinstance(client, MockRedis)` and aborts immediately if Redis connectivity is lost.
  - MongoDB connection failures in Login service immediately terminate the process rather than serving requests in an undefined offline state.

### Rule 4: Single Base URL & Path-Based Routing
* **Unified Origin**:
  - The frontend client communicates with **one base URL** (`/api/*`, `/ai/*`, `/share/*`).
  - Eliminates Cross-Origin Resource Sharing (CORS) complexity in browser contexts.
  - Enables browsers to transmit `httpOnly; SameSite=Strict` authentication cookies across all services without third-party cookie restrictions or cross-origin headers.
  - The reverse proxy manages path rewriting, connection timeouts, and unbuffered SSE streaming for AI generation.

---

## 3. Reverse Proxy & Gateway Configurations

### 3.1 Nginx Gateway Configuration (`Frontend/nginx.conf` & `gateway/nginx.conf`)
```nginx
server {
    listen 80;
    server_name localhost;

    # Security Headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gateway Health Check
    location /healthz {
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # 1. Login Service (/api/*)
    location /api/ {
        proxy_pass http://login:5003/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 2. GenAI Service (/ai/*)
    location /ai/ {
        proxy_pass http://genai:5001/;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;        # Mandatory for real-time SSE token streaming
        proxy_cache off;
        proxy_read_timeout 300s;    # Accommodates longer code generation tasks
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 3. TempFile Service (/share/*)
    location /share/ {
        proxy_pass http://tempfile:5002/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static Frontend SPA
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
}
```

### 3.2 Caddy Alternative Configuration (`gateway/Caddyfile`)
```caddy
:80 {
    respond /healthz 200 {
        body "gateway healthy\n"
    }

    handle_path /api/* {
        reverse_proxy login:5003
    }

    handle_path /ai/* {
        reverse_proxy genai:5001 {
            flush_interval -1
        }
    }

    handle_path /share/* {
        reverse_proxy tempfile:5002
    }

    handle {
        reverse_proxy frontend:80
    }
}
```

### 3.3 Vite Development Proxy (`Frontend/vite.config.js`)
In local development (`npm run dev`), the Vite development server provides identical routing:
```javascript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:5003',
      changeOrigin: true,
    },
    '/ai': {
      target: 'http://localhost:5001',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/ai/, ''),
    },
    '/share': {
      target: 'http://localhost:5002',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/share/, ''),
    },
  },
}
```

---

## 4. Frontend Client Integration

In `Frontend/src/utils/constants.js`:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL !== undefined
  ? import.meta.env.VITE_API_GATEWAY_URL
  : '';

export const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL !== undefined
  ? import.meta.env.VITE_BACKEND_API_URL
  : API_BASE_URL;

export const GENAI_API_URL = import.meta.env.VITE_GEMINI_API_URL !== undefined
  ? import.meta.env.VITE_GEMINI_API_URL
  : (API_BASE_URL ? `${API_BASE_URL}/ai` : '/ai');

export const TEMP_SHARE_API_URL = import.meta.env.VITE_TEMP_SHARE_URL !== undefined
  ? import.meta.env.VITE_TEMP_SHARE_URL
  : (API_BASE_URL ? `${API_BASE_URL}/share` : '/share');
```

In `Frontend/src/utils/apifetch.js`:
- All requests default to `credentials: "include"`, ensuring `httpOnly` authentication cookies are sent to the single gateway origin.
- All mutating requests (`POST`, `PUT`, `DELETE`) automatically resolve and attach the Google `X-Recaptcha-Token` header.
- Authorization header fallback is automatically appended from storage if present.

---

## 5. Security & Verification Matrix

| Endpoint | Method | Service | Gateway Path | JWT Required | reCAPTCHA Required | Cookie Auth Supported |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| `/api/register` | POST | Login | `/api/register` | ❌ | ✅ | N/A |
| `/api/login` | POST | Login | `/api/login` | ❌ | ✅ | Sets `httpOnly` |
| `/api/verify-otp` | POST | Login | `/api/verify-otp` | ❌ | ✅ | Sets `httpOnly` |
| `/api/auth/google` | POST | Login | `/api/auth/google` | ❌ | ✅ | Sets `httpOnly` |
| `/api/logout` | POST | Login | `/api/logout` | ❌ | ❌ | Clears `httpOnly` |
| `/api/change-password` | POST | Login | `/api/change-password` | ✅ | ✅ | Sets `httpOnly` |
| `/api/runCode/count` | POST | Login | `/api/runCode/count` | ✅ | ✅ | ✅ |
| `/api/user/sharedLink/:id` | DELETE | Login | `/api/user/sharedLink/:id` | ✅ | ✅ | ✅ |
| `/generate_code` | POST | GenAI | `/ai/generate_code` | ✅ | ✅ | ✅ |
| `/get-output` | POST | GenAI | `/ai/get-output` | ✅ | ✅ | ✅ |
| `/refactor_code` | POST | GenAI | `/ai/refactor_code` | ✅ | ✅ | ✅ |
| `/improve-prompt` | POST | GenAI | `/ai/improve-prompt` | ✅ | ✅ | ✅ |
| `/htmlcssjsgenerate-code` | POST | GenAI | `/ai/htmlcssjsgenerate-code` | ✅ | ✅ | ✅ |
| `/temp-file-upload` | POST | TempFile | `/share/temp-file-upload` | ✅ | ✅ | ✅ |
| `/file/:id/delete` | DELETE | TempFile | `/share/file/:id/delete` | ✅ | ✅ | ✅ |
| `/api/prompts` | GET | GenAI | `/ai/api/prompts` | ❌ | ❌ | N/A |
| `/file/:shareId` | GET | TempFile | `/share/file/:shareId` | ❌ | ❌ | N/A |
