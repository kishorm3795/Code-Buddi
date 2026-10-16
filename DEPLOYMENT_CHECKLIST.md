# Code-Buddi Deployment Checklist
## Phase 4: Production Deployment

> **Note**: Replace placeholder values (like `<username>`, `<password>`, `<cluster>`, `yourdomain.com`, etc.) with your actual values.

---

### 🔐 Prerequisites
- [ ] Accounts created on:
  - MongoDB Atlas
  - Redis provider (Redis Labs, AWS Elasticache, etc.)
  - Backend host (Render, Railway, Fly.io, or VPS provider)
  - Frontend host (Vercel, Netlify, or Cloudflare Pages)
  - Google Cloud Console
- [ ] Domain name purchased and DNS accessible
- [ ] Email service configured for OTP (Gmail, SendGrid, etc.)

---

### 1. MongoDB Atlas Setup
- [ ] Create MongoDB Atlas cluster (M0 free tier or higher)
- [ ] Configure IP whitelist:
  - Add your development IP for testing
  - Add backend server IPs/ranges when deployed
  - Consider allowing access from VPC if applicable
- [ ] Create database user with least privilege:
  - Role: `readWrite` on the `codebuddi` database only
  - Authentication: SCRAM-SHA-256
- [ ] Get connection string:
  ```
  mongodb+srv://<username>:<password>@<cluster>.mongodb.net/codebuddi?retryWrites=true&w=majority
  ```
- [ ] Update `Backend/Login/.env.production` with the MongoDB URI

### 2. Redis Setup (Managed, TLS Enabled)
- [ ] Create managed Redis instance:
  - Options: Redis Labs, AWS Elasticache (with TLS), Google Cloud Memorystore, Azure Cache for Redis
  - Enable TLS encryption
  - Configure persistence if needed (RDB/AOF)
- [ ] Get connection details:
  - Host: `your-redis-host.example.com`
  - Port: `6379` (or TLS port if different)
  - Password: `your_redis_password_here`
- [ ] Update `Backend/TempFile/.env.production`:
  - Set `REDIS_HOST=your-redis-host.example.com`
  - Set `REDIS_PASSWORD=your_redis_password_here`
  - Set `REDIS_SSL=true`

### 3. Backend Deployment (Container-Friendly Host)
Choose one: Render, Railway, Fly.io, or VPS with Docker

#### Option A: Using Render/Railway/Fly.io (Recommended)
- [ ] Connect your GitHub repository
- [ ] Create three separate services:
  1. **Login Service** (Node.js/Express)
  2. **Genai Service** (Python/Flask)
  3. **TempFile Service** (Python/Flask)
- [ ] For each service:
  - Set build command: Uses existing Dockerfile
  - Set environment variables from `.env.production` files
  - Ensure health check endpoints are configured (`/health`)
  - Set appropriate ports (5003, 5001, 5002 respectively)
  - Enable automatic deploys from main branch

#### Option B: VPS with Docker
- [ ] Install Docker and Docker Compose on VPS
- [ ] Create production `docker-compose.prod.yml`:
  ```yaml
  version: '3.8'
  services:
    mongodb:
      # Use external MongoDB Atlas - comment out local MongoDB
      # external_links:
      #   - mongodb
    redis:
      # Use external Redis - comment out local Redis
      # external_links:
      #   - redis
    login:
      build: ./Backend/Login
      ports: ["5003:5003"]
      env_file: ./Backend/Login/.env.production
      restart: unless-stopped
    genai:
      build: ./Backend/Genai
      ports: ["5001:5001"]
      env_file: ./Backend/Genai/.env.production
      restart: unless-stopped
    tempfile:
      build: ./Backend/TempFile
      ports: ["5002:5002"]
      env_file: ./Backend/TempFile/.env.production
      restart: unless-stopped
    frontend:
      build: ./Frontend
      ports: ["80:80"]
      env_file: ./Frontend/.env.production
      restart: unless-stopped
  ```
- [ ] Update `.env.production` files with actual service URLs
- [ ] Deploy with: `docker compose -f docker-compose.prod.yml up -d`

### 4. Frontend Deployment (Vercel/Netlify/Cloudflare Pages)
- [ ] Connect your GitHub repository to Vercel/Netlify/Cloudflare
- [ ] Configure build settings:
  - Build command: `npm run build`
  - Publish directory: `dist` (or `build` depending on setup)
- [ ] Set environment variables from `Frontend/.env.production`:
  - `VITE_BACKEND_API_URL`
  - `VITE_GEMINI_API_URL`
  - `VITE_TEMP_SHARE_URL`
  - `VITE_RECAPTCHA_SITE_KEY`
  - `VITE_GOOGLE_CLIENT_ID`
- [ ] **IMPORTANT**: Configure SPA routing (Address D1 from DEPLOYMENT_AUDIT.md):
  - **Vercel**: Ensure `vercel.json` is NOT in `.gitignore` and contains:
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
  - **Netlify**: Create `public/_redirects` file with:
    ```
    /*    /index.html   200
    ```
  - **Cloudflare Pages**: Add `_redirects` file or use `_routes.json`

### 5. Google Cloud Console Configuration
- [ ] Go to Google Cloud Console > APIs & Services > Credentials
- [ ] Find your OAuth 2.0 Client ID for Web application
- [ ] Under "Authorized JavaScript origins":
  - Add: `https://yourdomain.com`
- [ ] Under "Authorized redirect URIs":
  - Add: `https://yourdomain.com/api/auth/google/callback`
- [ ] Go to reCAPTCHA v3 Admin console
- [ ] Add your domain to the reCAPTCHA site:
  - Domain: `yourdomain.com`
  - Ensure both site key and secret key are configured in respective `.env.production` files

### 6. Custom Domain + HTTPS
- [ ] Configure custom domain on your frontend host (Vercel/Netlify/Cloudflare Pages)
- [ ] Configure custom domain on your backend host (if supported)
- [ ] Ensure HTTPS is enabled (usually automatic on these platforms)
- [ ] Update `ALLOWED_ORIGINS` in all backend `.env.production` files:
  - Set to exactly: `https://yourdomain.com`
  - (No trailing slash, no wildcard subdomains unless specifically needed)
- [ ] Update frontend VITE_* variables to use your custom domain

### 7. Smoke Test
After all services are deployed and environment variables configured:
- [ ] Test user registration flow:
  1. Visit `https://yourdomain.com/register`
  2. Enter valid email, username, password
  3. Verify OTP email is received
  4. Enter OTP to complete registration
- [ ] Test login with credentials
- [ ] Test Google Login:
  1. Click "Login with Google"
  2. Complete Google authentication
  3. Verify account creation/login
- [ ] Test code generation:
  1. Navigate to editor
  2. Enter problem description and select language
  3. Click "Generate Code"
  4. Verify code is generated correctly
- [ ] Test code execution:
  1. Enter code in editor
  2. Click "Run Code"
  3. Verify output is displayed correctly
- [ ] Test code refactoring:
  1. Generate some code
  2. Click "Refactor Code"
  3. Verify refactored code is correct
- [ ] Test sharing functionality:
  1. Click "Share" on generated/refactored code
  2. Set expiry time and title
  3. Copy share link
  4. Open share link in private/incognito window
  5. Verify shared content is accessible
  6. Test deletion of share link (if implemented)
- [ ] Test all pages load correctly:
  - Homepage
  - Login
  - Register
  - Editor
  - Accounts (if implemented)

### 8. Monitoring & Alerts (Recommended)
- [ ] Set up health check monitoring (using the `/health` endpoints)
- [ ] Configure error tracking (Sentry, LogRocket, etc.)
- [ ] Set up uptime monitoring (UptimeRobot, etc.)
- [ ] Review logs periodically for the first 24-48 hours

---

## 📝 Notes
1. **Security**: Never commit actual `.env.production` files to git. Use platform-specific secret management.
2. **Scaling**: Consider scaling strategies for each service based on expected load.
3. **Backups**: Implement backup strategies for MongoDB and Redis data.
4. **Updates**: Plan for zero-downtime deployments when updating services.
5. **Cost Monitoring**: Monitor usage and costs, especially for managed services.

---

## ✅ Completion
Once all steps are completed and smoke tests pass, your Code-Buddi instance is ready for production use!

**Next Steps**: Consider setting up CI/CD pipelines for automated testing and deployment.