# Code-Buddi Production Deployment Guide

This guide provides end-to-end instructions for deploying Code-Buddi into production using managed cloud infrastructure, secure secrets management, and automated continuous delivery.

---

## 1. Architecture Overview

Code-Buddi is designed as a modular cloud-ready architecture:

- **Frontend**: Single Page Application (React 19, Vite, Tailwind CSS, Monaco Editor) hosted on **Vercel** or **Netlify** with automatic SSL and global CDN edge routing.
- **API Gateway / Reverse Proxy**: **Caddy** or **Nginx** acting as a unified entrypoint routing `/api` to Login, `/ai` to Genai, `/share` to TempFile, eliminating complex cross-origin cookies and CORS issues.
- **Backend - Login Service**: Node.js 22 Express microservice handling authentication (JWT HS512, bcryptjs, OTP verification, Google OAuth 2.0) deployed on **Render** (or Railway).
- **Backend - Genai Service**: Python 3.12 Flask microservice with Gunicorn threaded streaming workers calling Google Gemini 2.5 models deployed on **Render** (or Railway).
- **Backend - TempFile Service**: Python 3.12 Flask microservice with Gunicorn managing temporary code sharing and TTL expiration backed by Redis, deployed on **Render** (or Railway).
- **Database**: **MongoDB Atlas** (managed MongoDB cluster with TLS and IP access controls).
- **In-Memory Store**: **Upstash Redis** or **Redis Cloud** (managed Redis with TLS enabled).

```
                      ┌────────────────────────────────────────┐
                      │              Web Client                │
                      │     (https://app.codebuddi.dev)        │
                      └──────────────────┬─────────────────────┘
                                         │
                                         ▼
                      ┌────────────────────────────────────────┐
                      │        Reverse Proxy / Gateway         │
                      │   (Nginx / Caddy or Render Gateway)    │
                      └────┬─────────────┼─────────────────┬───┘
                           │             │                 │
              /api/*       │      /ai/*  │        /share/* │
        ┌──────────────────┘             │                 └──────────────────┐
        ▼                                ▼                                    ▼
┌───────────────┐               ┌────────────────┐                   ┌────────────────┐
│ Login Service │               │ Genai Service  │                   │TempFile Service│
│  (Node.js 22) │               │ (Python 3.12)  │                   │ (Python 3.12)  │
└───────┬───────┘               └────────┬───────┘                   └────────┬───────┘
        │                                │                                    │
        ▼                                ▼                                    ▼
┌───────────────┐               ┌────────────────┐                   ┌────────────────┐
│ MongoDB Atlas │               │ Gemini Pro API │                   │ Managed Redis  │
│  (Cloud M0)   │               │ (Google Cloud) │                   │ (TLS / Upstash)│
└───────────────┘               └────────────────┘                   └────────────────┘
```

---

## 2. Step 1: MongoDB Atlas Setup

1. **Create an Account and Cluster**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in.
   - Click **Create**, choose the **M0 Free Tier** (or higher for dedicated workloads), and select your preferred cloud provider and region (choose the region closest to your backend services, e.g., `us-east-1`).
   - Click **Create Cluster**.

2. **Configure Database User**:
   - In Atlas, navigate to **Security** -> **Database Access**.
   - Click **Add New Database User**.
   - Authentication Method: **Password**.
   - Set a secure username (e.g., `codebuddi_app`) and generate a strong password (at least 24 random characters).
   - Database User Privileges: Select **Read and write to any database** (or scope specifically to the `codebuddi` database).
   - Click **Add User**.

3. **Configure Network Access**:
   - Navigate to **Security** -> **Network Access**.
   - Click **Add IP Address**.
   - If hosting backends on dynamic cloud platforms (Render, Railway, Fly.io), select **Allow Access from Anywhere** (`0.0.0.0/0`).
   - *Note*: Secure your database with a long password; MongoDB Atlas enforces TLS on all connections.

4. **Obtain Connection URI**:
   - Navigate to **Database** -> **Clusters** and click **Connect**.
   - Choose **Drivers** (Node.js).
   - Copy the SRV connection string:
     ```
     mongodb+srv://codebuddi_app:<db_password>@cluster0.abcde.mongodb.net/codebuddi?retryWrites=true&w=majority
     ```
   - Replace `<db_password>` with your actual password and ensure the database name `/codebuddi` is in the path.

---

## 3. Step 2: Managed Redis with TLS Setup (Upstash / Redis Cloud)

1. **Option A: Upstash Redis (Serverless, Recommended)**:
   - Sign up at [Upstash](https://upstash.com/).
   - Click **Create Database**.
   - Set Name to `codebuddi-redis`, select the region closest to your backends, and ensure **TLS (SSL)** is enabled.
   - Click **Create**.
   - Under the **Details** tab, locate the **Redis Connect** section:
     - `REDIS_HOST`: e.g. `us1-crisp-falcon-12345.upstash.io`
     - `REDIS_PORT`: `6379` (or specified TLS port)
     - `REDIS_PASSWORD`: your Upstash password / token
     - `REDIS_SSL`: `true`

2. **Option B: Redis Cloud (RedisLabs)**:
   - Sign up at [Redis Cloud](https://redis.io/try-free/).
   - Create a subscription and database with **TLS enabled**.
   - Note the endpoint, port, password, and set `REDIS_SSL=true`.

---

## 4. Step 3: Google OAuth 2.0 & Google reCAPTCHA v3 Setup

### Google OAuth 2.0 Web Client

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named `Code-Buddi`.
3. Navigate to **APIs & Services** -> **OAuth consent screen**:
   - User Type: **External**.
   - App Name: `CodeBuddi`.
   - User support email and Developer contact email: your email.
   - Scopes: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`.
   - Publish the app or set to Testing (with your test emails added).
4. Navigate to **APIs & Services** -> **Credentials**:
   - Click **Create Credentials** -> **OAuth client ID**.
   - Application type: **Web application**.
   - Name: `CodeBuddi Web Client`.
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (for local development)
     - `http://localhost`
     - `https://your-frontend.vercel.app`
     - `https://codebuddi.dev` (your custom production domain)
   - Click **Create**.
   - Copy your **Client ID** (e.g. `123456789-abcdef.apps.googleusercontent.com`).
   - Set this as `GOOGLE_CLIENT_ID` in Backend Login and `VITE_GOOGLE_CLIENT_ID` in Frontend.

### Google reCAPTCHA v3

1. Go to the [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin).
2. Click **Create** (+):
   - Label: `CodeBuddi Production`.
   - reCAPTCHA type: **Score based (v3)**.
   - Domains: Add `localhost`, `127.0.0.1`, `your-frontend.vercel.app`, `codebuddi.dev`.
   - Accept the reCAPTCHA Terms of Service and submit.
3. Copy the keys:
   - **Site Key** -> `VITE_RECAPTCHA_SITE_KEY` in Frontend.
   - **Secret Key** -> `RECAPTCHA_SECRET_KEY` in Login, Genai, and TempFile backends.

---

## 5. Step 4: Backend Services Deployment on Render

[Render](https://render.com) provides straightforward native Docker or runtime hosting for web services with automated SSL and health checking.

### A. Shared Secrets to Generate

Generate a 64-byte cryptographic secret for JWT authentication:
```bash
openssl rand -hex 64
```
Save this value as `JWT_SECRET`. It must be identical across `Login`, `Genai`, and `TempFile`.

---

### B. Deploy Login Service (`Backend/Login`)

1. In Render Dashboard, click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure the service:
   - **Name**: `codebuddi-login`
   - **Root Directory**: `Backend/Login`
   - **Runtime**: `Docker` (or `Node`, Build: `npm ci --omit=dev`, Start: `npm start`)
   - **Dockerfile Path**: `Dockerfile`
   - **Instance Type**: Free or Starter
   - **Health Check Path**: `/health`
4. Add Environment Variables:
   | Variable | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Production mode |
   | `PORT` | `5003` | Service port |
   | `MONGO_URI` | `mongodb+srv://...` | MongoDB Atlas SRV URI |
   | `JWT_SECRET` | `<64-byte hex key>` | Shared HS512 secret |
   | `RECAPTCHA_SECRET_KEY`| `<Google secret key>` | reCAPTCHA v3 secret |
   | `GOOGLE_CLIENT_ID` | `<Google OAuth Client ID>`| Google Web Client ID |
   | `OTP_EMAIL_SERVICE` | `gmail` (or SMTP provider)| Email provider |
   | `OTP_EMAIL_USER` | `your-email@gmail.com` | Notification sender email |
   | `OTP_EMAIL_PASS` | `<App Password>` | Gmail app-specific password |
   | `ALLOWED_ORIGINS` | `https://your-frontend.vercel.app,https://codebuddi.dev` | Allowed CORS origins |
5. Click **Create Web Service**. Note the assigned URL: `https://codebuddi-login.onrender.com`.

---

### C. Deploy Genai Service (`Backend/Genai`)

1. In Render Dashboard, click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure the service:
   - **Name**: `codebuddi-genai`
   - **Root Directory**: `Backend/Genai`
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `Dockerfile`
   - **Health Check Path**: `/health`
4. Add Environment Variables:
   | Variable | Value | Description |
   |---|---|---|
   | `FLASK_ENV` | `production` | Production mode |
   | `PORT` | `5001` | Service port |
   | `GEMINI_API_KEY` | `<Your Gemini API Key>` | From Google AI Studio |
   | `GEMINI_MODEL` | `gemini-2.5-pro` | Primary AI model |
   | `GEMINI_MODEL_1` | `gemini-2.5-flash` | Secondary fast model |
   | `JWT_SECRET` | `<Same 64-byte hex key>`| Shared HS512 secret |
   | `RECAPTCHA_SECRET_KEY`| `<Google secret key>` | reCAPTCHA v3 secret |
   | `ALLOWED_ORIGINS` | `https://your-frontend.vercel.app,https://codebuddi.dev` | Allowed CORS origins |
5. Click **Create Web Service**. Note the assigned URL: `https://codebuddi-genai.onrender.com`.

---

### D. Deploy TempFile Service (`Backend/TempFile`)

1. In Render Dashboard, click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure the service:
   - **Name**: `codebuddi-tempfile`
   - **Root Directory**: `Backend/TempFile`
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `Dockerfile`
   - **Health Check Path**: `/health`
4. Add Environment Variables:
   | Variable | Value | Description |
   |---|---|---|
   | `FLASK_ENV` | `production` | Production mode |
   | `APP_ENV` | `production` | Production flag |
   | `PORT` | `5002` | Service port |
   | `TEMP_FILE_URL` | `https://codebuddi-tempfile.onrender.com` | Base URL for share links |
   | `REDIS_HOST` | `<Upstash / Redis Host>` | Redis hostname |
   | `REDIS_PORT` | `6379` | Redis TLS port |
   | `REDIS_PASSWORD` | `<Upstash Password>` | Redis password |
   | `REDIS_SSL` | `true` | Enforces TLS connection |
   | `JWT_SECRET` | `<Same 64-byte hex key>`| Shared HS512 secret |
   | `RECAPTCHA_SECRET_KEY`| `<Google secret key>` | reCAPTCHA v3 secret |
   | `ALLOWED_ORIGINS` | `https://your-frontend.vercel.app,https://codebuddi.dev` | Allowed CORS origins |
5. Click **Create Web Service**. Note the assigned URL: `https://codebuddi-tempfile.onrender.com`.

---

### E. (Optional) Deploy API Gateway / Reverse Proxy

If you want a single unified backend domain (e.g., `https://api.codebuddi.dev`), deploy a lightweight Caddy or Nginx service using the configs in `gateway/`:
- `gateway/Caddyfile`: routes `/api` -> `codebuddi-login`, `/ai` -> `codebuddi-genai`, `/share` -> `codebuddi-tempfile`.
- `gateway/nginx.conf`: Nginx reverse proxy with SSE buffering disabled for `/ai/`.

---

## 6. Step 5: Frontend Deployment on Vercel or Netlify

### Deploying on Vercel

1. Log into [Vercel](https://vercel.com) and click **Add New** -> **Project**.
2. Select your repository `Code-Buddi`.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and select `Frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`
4. Add Environment Variables in the Vercel Project Settings:
   - If using the **Unified API Gateway** (`api.codebuddi.dev`):
     ```
     VITE_API_GATEWAY_URL=https://api.codebuddi.dev
     ```
   - If connecting directly to individual Render services:
     ```
     VITE_BACKEND_API_URL=https://codebuddi-login.onrender.com
     VITE_GEMINI_API_URL=https://codebuddi-genai.onrender.com
     VITE_TEMP_SHARE_URL=https://codebuddi-tempfile.onrender.com
     ```
   - Required Client Keys:
     ```
     VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
     VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
     ```
5. Click **Deploy**.
6. The included `Frontend/vercel.json` provides the rewrite rule to route all paths to `index.html`, ensuring clean client-side routing.

### Deploying on Netlify (Alternative)

1. Log into [Netlify](https://app.netlify.com/) and click **Add new site** -> **Import an existing project**.
2. Set **Base directory** to `Frontend`, **Build command** to `npm run build`, and **Publish directory** to `dist`.
3. The included `Frontend/public/_redirects` file automatically configures `/*  /index.html  200` SPA fallback.
4. Set the same `VITE_*` environment variables in Site settings -> Environment variables.
5. Deploy the site.

---

## 7. Step 6: Custom Domain & HTTPS Configuration

1. **Frontend Domain (e.g. `codebuddi.dev` or `app.codebuddi.dev`)**:
   - In Vercel, go to **Settings** -> **Domains**.
   - Add `codebuddi.dev` and `www.codebuddi.dev`.
   - In your DNS provider (e.g., Cloudflare, Namecheap, GoDaddy):
     - For apex `codebuddi.dev`: Add an `A` record pointing to `76.76.21.21`.
     - For `www` or subdomains: Add a `CNAME` record pointing to `cname.vercel-dns.com`.
   - Vercel automatically generates and renews a Let's Encrypt TLS certificate.

2. **Backend Domain (e.g. `api.codebuddi.dev`)**:
   - In Render, navigate to your Gateway or service -> **Settings** -> **Custom Domains**.
   - Add `api.codebuddi.dev`.
   - In your DNS provider, create a `CNAME` record for `api` pointing to your Render service address (e.g., `codebuddi-login.onrender.com`).
   - Render automatically issues a TLS certificate and enforces HTTPS.

3. **Update Google Cloud & reCAPTCHA Settings**:
   - Add `codebuddi.dev` to Authorized JavaScript origins in the Google Cloud Console.
   - Add `codebuddi.dev` to Authorized domains in the Google reCAPTCHA Console.

---

## 8. Step 7: Post-Deploy Smoke Test Checklist

Execute these checks after deployment to verify end-to-end functionality:

### 1. Health Checks
Run `curl` against each production health endpoint:

```bash
# Login Service Health Check
curl -i https://<login-url>/health
# Expected: HTTP/1.1 200 OK, {"status":"healthy","database":"connected"}

# Genai Service Health Check
curl -i https://<genai-url>/health
# Expected: HTTP/1.1 200 OK, {"status":"healthy","components":{"gemini_api_healthy":true,...}}

# TempFile Service Health Check
curl -i https://<tempfile-url>/health
# Expected: HTTP/1.1 200 OK, {"status":"healthy","components":{"redis":{"healthy":true,...}}}

# Frontend / Gateway Health Check
curl -i https://<frontend-url>/
# Expected: HTTP/1.1 200 OK, Content-Type text/html
```

---

### 2. Security Headers & TLS Audit
Verify that HSTS, CSP, and framing protections are present:

```bash
curl -I https://<frontend-url>/
```
Verify the following headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (or configured frame-ancestors)
- `Referrer-Policy: strict-origin-when-cross-origin`

---

### 3. Authentication & User Flow
- [ ] **Registration**: Open `https://<frontend-url>/register`. Register with a test email. Confirm that a 6-digit OTP email is delivered via your SMTP service.
- [ ] **OTP Verification**: Enter the OTP within the 5-minute expiry window. Confirm successful login and redirect to the Editor.
- [ ] **Cookie Verification**: Check DevTools -> Application -> Cookies. Verify that the session token cookie has `Secure`, `HttpOnly`, and `SameSite=None` (or `Lax` on same-domain setups).
- [ ] **Google Sign-In**: Click "Sign in with Google". Verify the consent modal opens without origin errors and authenticates cleanly.
- [ ] **Token Expiration / Invalidation**: Test changing passwords or logging out to verify the token is cleared.

---

### 4. AI Code Generation & Streaming
- [ ] Open the Code Editor. Select **Python** (or **HTML/CSS/JS**).
- [ ] Click **Generate Code** and describe a simple prompt (e.g. "Create a fibonacci generator").
- [ ] Verify that the AI output streams smoothly chunk-by-chunk in real time without buffering lag or timeouts.
- [ ] Check Network tab: the request to `/ai/generate` or `/generate` should have `Transfer-Encoding: chunked` and no proxy buffering.
- [ ] Click **Refactor Code** on existing code to confirm the refactoring endpoint functions properly.

---

### 5. Temporary Code Sharing
- [ ] Click the **Share** button in the Editor.
- [ ] Choose an expiry duration (e.g. 10 minutes) and enter a title.
- [ ] Confirm that a unique share link is generated (e.g. `https://<frontend-url>/share/python-<uuid>`).
- [ ] Open the generated link in an Incognito / private window.
- [ ] Verify that the shared code renders accurately in read-only mode with the countdown timer active.
- [ ] Check that snippet deletion works correctly from the **Shared Links** page.

---

### 6. Single Page Application (SPA) Deep Link Verification
- [ ] Navigate directly in the browser address bar to `https://<frontend-url>/accounts`.
- [ ] Press **Hard Refresh** (`Cmd+Shift+R` or `Ctrl+F5`).
- [ ] Confirm that the page loads properly without an HTTP 404 error (verifying `vercel.json` rewrite / `_redirects` functionality).
- [ ] Navigate to `https://<frontend-url>/login` and reload directly.
