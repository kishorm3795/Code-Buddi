# Reliability & Correctness Master Plan

This document details all reliability, correctness, architectural debt, and operational risks across the **Code-Buddi** microservices and frontend application, along with specific remediation blueprints.

---

## Severity Levels

* **P0 - Critical**: High blast-radius failures, silent data corruption/loss, broken fresh deployments, or single-threaded process starvation in production.
* **P1 - High**: Significant database inefficiencies, unhandled streaming errors, deprecated ORM hooks, architectural bottlenecks, or semantic discrepancies in user-facing features.
* **P2 - Medium / Code Health**: Unpinned package dependencies, monolithic components with heavy code duplication, and configuration hygiene.

---

## Master Issue Catalog

| # | Sev | Component & Location | Defect / Failure Mode | Remediation Blueprint |
|---|---|---|---|---|
| **R1** | **P0** | `Backend/TempFile/utils.py`<br>*(lines 20–64)* | **Silent MockRedis Fallback & Hardcoded TLS Disable**: When Redis is unreachable or unconfigured, it silently defaults to an in-memory `MockRedis`. Links vanish on process restart, vary across worker processes, and `ttl()` hardcodes `100` (meaning links never expire properly). Furthermore, `ssl=False` (line 57) breaks hosted Redis providers (e.g. Upstash, ElastiCache) requiring TLS. | Remove `MockRedis` outside local development (`FLASK_ENV != 'development'`). In production, fail fast with a `503 Service Unavailable` and structured error log. Support TLS configuration via `REDIS_SSL=true`. |
| **R2** | **P0** | `Backend/Genai/*`<br>`.env.example` *(line 25)* | **Commented Out API Key & Missing Startup Validation**: Google GenAI Client `genai.Client()` requires `GEMINI_API_KEY`, but the key variable is commented out in `.env.example`. Any fresh deployment fails unexpectedly on the first API call. | Uncomment and document `GEMINI_API_KEY` in `.env.example`. Validate its presence and connectivity on application startup. |
| **R3** | **P0** | `.env.example`<br>*(line 27)* | **Deprecated/Retired Model Identifiers**: `GEMINI_MODEL_1=gemini-1.5-flash` references legacy model identifiers subject to retirement or deprecation. | Update `.env.example` and service defaults to current production model tiers (e.g., `gemini-2.5-flash` / `gemini-2.5-pro` or latest stable releases). |
| **R4** | **P0** | `Backend/Genai/app.py`<br>`Backend/TempFile/app.py` | **Built-in Flask Development Server Used**: Services run via `app.run()`. Single-threaded or naive WSGI blocks workers during SSE streaming or concurrent user calls. | Deploy behind Gunicorn using a streaming-compatible worker model (`gunicorn -w 2 -k gthread --threads 8 -t 120 app:app`). |
| **R5** | **P1** | `Backend/Login/config/db.js` | **Swallowed Database Connection Failures**: Errors during `mongoose.connect()` are merely `console.error`'d without re-throwing. Incoming requests continue to execute against an uninitialized connection pool, leading to opaque Mongoose timeout errors. | Connect once upon application bootstrap, exit process on fatal startup failure, configure explicit `serverSelectionTimeoutMS`, and expose a `/health` endpoint. |
| **R6** | **P1** | `Backend/Login/middlewares/cleanExpired.js` | **Full Collection Scans on Request Paths**: Performs an unbounded `User.deleteMany({ isEmailVerified: false, otpExpires: { $lte: new Date() } })` inside request middleware on every route that references it. | Remove request-bound cleanup middleware. Utilize a MongoDB TTL index on `otpExpires` or delegate cleanup to a recurring background job. |
| **R7** | **P1** | `Backend/Login/models/User.js` | **Deprecated Hooks & Subdocument Index Limitations**: `pre('remove')` is deprecated in modern Mongoose versions. Repetitive language count definitions. Subdocument `unique: true` index on `sharedLinks.shareId` does not reliably guarantee global uniqueness in MongoDB. | Migrate to `deleteOne` / `findOneAndDelete` hooks, refactor count maps to use a shared schema, and consider migrating shared links into an independent collection (`SharedLink`). |
| **R8** | **P1** | `Backend/Genai/app.py`<br>*(lines 160–230)* | **Redundant Stream Functions & Unstructured Error Handlers**: Three near-identical streaming functions for `html`, `css`, and `js`. Internal streaming failures return plaintext chunks within HTTP 200 responses rather than structured JSON error payloads before stream headers are dispatched. | Consolidate into a unified parameterized streaming generator (`stream_gemini_response`). Validate parameters and fail with JSON status codes prior to streaming. |
| **R9** | **P1** | `Backend/Genai/app.py`<br>*(Run Code Feature)* | **AI-Simulated Execution Ambiguity**: The "run-code" endpoint uses LLM prompting (`compiler_instruction`) to simulate code execution. Output cannot process interactive input (`stdin`), non-deterministic system operations, high concurrency, or real-time timing. | Clearly label results as "AI-Simulated Execution" in the frontend UI, or integrate a true containerized sandbox execution engine (e.g. Judge0 or Piston). |
| **R10** | **P2** | `Backend/Genai/requirements.txt`<br>`Backend/TempFile/requirements.txt` | **Unpinned Dependencies & Missing Production Server Packages**: Dependencies are floating without exact version pins, and production dependencies (`gunicorn`, `flask-limiter`) are absent. | Pin all package versions and add `gunicorn` and `flask-limiter`. |
| **R11** | **P2** | `Frontend/src/components/Editor.jsx`<br>`Frontend/src/components/CodeEditor.jsx` | **Monolithic Frontend Components (~1370 & ~1260 lines)**: Massive components duplicate state management, API requests, token handling, SweetAlert2 prompts, and shared link operations. | Extract reusable custom hooks (`useAuth`, `useGenai`, `useSharedLinks`) and a centralized API service client. |
| **R12** | **P2** | `Frontend/package.json` | **Outdated Name & Erroneous Dependency**: Project name is still `"online-ide"` and devDependencies includes `"install": "^0.13.0"` (accidental install artifact). | Rename package to `"code-buddi"` and remove the invalid `"install"` dependency. |

---

## Detailed Remediation Blueprint

### R1: Production Redis Enforcement & TLS Support
* **File**: `Backend/TempFile/utils.py`
```python
def get_redis_connection():
    redis_host = os.getenv("REDIS_HOST")
    is_production = os.getenv("FLASK_ENV") == "production" or os.getenv("NODE_ENV") == "production"

    if not redis_host:
        if is_production:
            logging.error("FATAL: REDIS_HOST must be configured in production.")
            return None
        logging.warning("Using Mock Redis for local development only.")
        return MockRedis()

    try:
        use_ssl = os.getenv("REDIS_SSL", "false").lower() in ("true", "1", "yes")
        redis_client = redis.StrictRedis(
            host=redis_host,
            port=int(os.getenv("REDIS_PORT") or 6379),
            password=os.getenv("REDIS_PASSWORD") or None,
            ssl=use_ssl,
            socket_timeout=5,
            socket_connect_timeout=5,
        )
        redis_client.ping()
        return redis_client
    except (redis.ConnectionError, redis.TimeoutError) as e:
        logging.error(f"Failed to connect to Redis at {redis_host}: {e}")
        if is_production:
            return None
        return MockRedis()
```
And in `app.py`:
```python
redis_client = get_redis_connection()
if not redis_client:
    return jsonify({"error": "Storage service unavailable"}), 503
```

---

### R2 & R3: Environment Defaults & Gemini Key Validation
* **File**: `.env.example`
```dotenv
# ==========================================
# Backend - Genai (.env for Backend/Genai)
# ==========================================
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-pro
GEMINI_MODEL_1=gemini-2.5-flash
JWT_SECRET=your_jwt_secret_here
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key_here
```
* **Startup Validation** in `Backend/Genai/app.py`:
```python
gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key:
    logging.critical("GEMINI_API_KEY environment variable is missing. LLM features will fail.")
```

---

### R4: Gunicorn Production WSGI Configuration
* Add `Procfile` / run scripts:
```bash
# Backend/Genai
gunicorn -w 2 -k gthread --threads 8 -t 120 --bind 0.0.0.0:5001 app:app

# Backend/TempFile
gunicorn -w 2 -k gthread --threads 8 -t 120 --bind 0.0.0.0:5002 app:app
```
Threads allow multiple concurrent Server-Sent Events (SSE) and long-lived streams without exhausting worker processes.

---

### R5: Resilient MongoDB Connection & Health Endpoint
* **File**: `Backend/Login/config/db.js`
```javascript
const mongoose = require('mongoose');

async function connectDB() {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
        throw new Error('MONGO_URI is not defined in environment variables.');
    }

    try {
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('MongoDB connected successfully');
    } catch (err) {
        console.error('Fatal MongoDB connection error:', err.message);
        process.exit(1);
    }
}

module.exports = { connectDB };
```
* Add `/health` in `Backend/Login/server.js`:
```javascript
app.get('/health', (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    res.status(isDbConnected ? 200 : 503).json({
        status: isDbConnected ? 'healthy' : 'unhealthy',
        database: isDbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});
```

---

### R6: MongoDB TTL Index for Expired Verification Records
* **File**: `Backend/Login/models/User.js`
Replace per-request `cleanExpired.js` middleware with a native TTL index on unverified accounts:
```javascript
// Automatically clean unverified users after otpExpires
userSchema.index(
    { otpExpires: 1 },
    {
        expireAfterSeconds: 0,
        partialFilterExpression: { isEmailVerified: false }
    }
);
```

---

### R7: Modern Mongoose Hooks & Shared Schemas
* **File**: `Backend/Login/models/User.js`
```javascript
// Replace deprecated remove hook
userSchema.pre('deleteOne', { document: true, query: false }, async function() {
    await logUserAction(this, 'delete');
});

// Consolidate reusable language counter schema
const languageCounterSchema = {
    py: { type: Number, default: 0 },
    js: { type: Number, default: 0 },
    HtmlJsCss: { type: Number, default: 0 },
    c: { type: Number, default: 0 },
    cpp: { type: Number, default: 0 },
    java: { type: Number, default: 0 },
    // ...
};
```

---

### R8: Unified Streaming Helper in Genai
* **File**: `Backend/Genai/app.py`
```python
def stream_gemini_content(model, prompt_content, system_instruction):
    try:
        client = genai.Client()
        response = client.models.generate_content_stream(
            model=model,
            contents=prompt_content,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
            ),
        )

        def generate():
            for chunk in response:
                if chunk.text:
                    yield chunk.text

        return Response(stream_with_context(generate()), mimetype="text/plain")
    except Exception as e:
        logging.error(f"Error during Gemini streaming: {e}")
        return jsonify({"error": str(e)}), 500
```

---

### R9: Clear Distinction for Simulated Code Execution
* **UI Transparency**: Label compiler output panel with:
  > **Note**: Execution output is simulated using Gemini AI. For guaranteed native execution with file I/O or interactive inputs, connect a dedicated compiler sandbox.
* **Sandbox Alternative**: Integrate an optional sandbox API (such as Judge0 or Piston) for strict real-world compilation and runtime metrics.

---

### R10: Pinned Python Dependencies
* `Backend/Genai/requirements.txt`:
```text
google-genai==1.5.0
python-dotenv==1.0.1
flask-cors==5.0.1
flask==3.1.0
pyjwt==2.10.1
requests==2.32.3
gunicorn==23.0.0
flask-limiter==3.10.1
```
* `Backend/TempFile/requirements.txt`:
```text
flask==3.1.0
flask-cors==5.0.1
redis==5.2.1
python-dotenv==1.0.1
pyjwt==2.10.1
requests==2.32.3
gunicorn==23.0.0
flask-limiter==3.10.1
```

---

### R11: Frontend Component Refactoring
* Create `Frontend/src/hooks/`:
  * `useAuth.js` – Centralizes token storage, Google authentication, and login state.
  * `useGenai.js` – Encapsulates prompt improvement, code generation, and streaming text reader.
  * `useSharedLinks.js` – Manages link creation, expiration calculation, and deletion.
* Shrinks `Editor.jsx` and `CodeEditor.jsx` by over 50% lines of code while eliminating copy-pasted fetch logic.

---

### R12: Clean Frontend `package.json`
* Change `"name": "online-ide"` to `"name": "code-buddi"`.
* Remove `"install": "^0.13.0"` from `devDependencies`.

---

## Remediation Progress Checklist

- [x] **Phase 1: P0 Critical Reliability**
  - [x] R1: Remove silent MockRedis in production; configure TLS (`REDIS_SSL=true`)
  - [x] R2: Uncomment `GEMINI_API_KEY` in `.env.example` & add startup validation
  - [x] R3: Update Gemini model references to active supported versions
  - [ ] R4: Set up Gunicorn with gthread workers for Flask services
- [x] **Phase 2: P1 Database & Streaming Architecture**
  - [x] R5: Connect MongoDB once on startup with timeout & add `/health`
  - [x] R6: Replace per-request `cleanExpired` with MongoDB TTL index
  - [x] R7: Update deprecated Mongoose hooks & DRY language schemas
  - [x] R8: Consolidate Genai streaming functions into a reusable helper
  - [x] R9: Clarify AI-simulated code execution in UI or integrate sandbox
- [ ] **Phase 3: P2 Dependency & Code Health**
  - [ ] R10: Pin Python requirements and add `gunicorn`
  - [ ] R11: Extract `useAuth`, `useGenai`, `useSharedLinks` hooks in Frontend
  - [ ] R12: Update Frontend `package.json` name and remove invalid dependency
