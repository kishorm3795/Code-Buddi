# Security Audit & Remediation Master Plan

This document tracks all identified security vulnerabilities, architectural security concerns, and remediation steps across the **Code-Buddi** platform.

---

## Severity Levels

* **P0 - Critical**: Must fix before any public deployment or hosting. Directly exploitable to tamper with accounts, bypass authentication, delete other users' data, abuse API quotas, or perform brute-force attacks.
* **P1 - High**: Must fix before onboarded real users. Vulnerabilities affecting session lifecycle, origin control (CORS), OAuth token validation, client-side storage, and information leakage.
* **P2 - Medium / Hardening**: Quality, defense-in-depth, input sanitization, and secret lifecycle management.

---

## Master Issue Catalog

| # | Sev | Component & Location | Vulnerability Description | Fix Specification |
|---|---|---|---|---|
| **S1** | **P0** | `Backend/Login/server.js`<br>*(POST `/api/runCode/count`, ~line 1112)* | **Unauthorized Counter Manipulation**: No token check. Takes `username` from request body, allowing anyone to modify any user's counter metrics. | Require JWT `Authorization: Bearer <token>`, extract `decoded.userId`, fetch user by ID, and ignore `username` in request body. Update `Frontend/src/components/CodeEditor.jsx` to send the auth header. |
| **S2** | **P0** | `Backend/Login/server.js`<br>*(DELETE `/api/sharedLink`, ~line 1352)* | **IDOR / Arbitrary Shared Link Deletion**: Deletes any user's shared link by `shareId` without authentication. | Require JWT. Verify `decoded.userId` and restrict deletion exclusively to links present in `user.sharedLinks`. |
| **S3** | **P0** | `Backend/Login/server.js`<br>*(DELETE `/api/user/sharedLink/:shareId`, ~line 1403)* | **Insecure Fallback Authentication Bypass**: JWT is optional. If missing, it queries `User.findOne({ 'sharedLinks.shareId': shareId })` and deletes the link. | Make JWT authentication strictly mandatory. Remove unauthenticated fallback branch entirely. Update `Frontend/src/components/SharedLinks.jsx` to pass the token. |
| **S4** | **P0** | `Backend/TempFile/app.py`<br>*(DELETE `/file/<file_id>/delete`, ~line 189)* | **Cross-User Shared File Deletion in Redis**: Any authenticated user can delete any other user's file knowing its `file_id`. | Store creator `userId` in Redis payload in `save_file`. In `delete_file`, verify that `request.user_data["userId"]` matches the record's `userId` before deleting. |
| **S5** | **P0** | `Backend/Genai/app.py`<br>*(POST `/get-output`, ~line 264)* | **Unauthenticated AI Quota Burn**: Route lacks `@token_required`. Anyone with a reCAPTCHA token can trigger code evaluation and deplete Gemini quotas. | Add `@token_required` decorator to require JWT. Update frontend calls to transmit `Authorization: Bearer <token>`. |
| **S6** | **P0** | `Backend/Login/middlewares/verifyRecaptcha.js`<br>`Backend/Genai/utils.py`<br>`Backend/TempFile/utils.py` | **Fail-Open reCAPTCHA Bypass**: When `RECAPTCHA_SECRET_KEY` is empty or missing, requests proceed unchecked (`next()` / `return True`). A misconfigured deployment is completely unprotected. | Refuse to start or fail closed (throw error or return 403/500) if `NODE_ENV=production` or `FLASK_ENV=production` and `RECAPTCHA_SECRET_KEY` is not set. |
| **S7** | **P0** | `Backend/Login/utils/otpGenerator.js`<br>`Backend/Login/server.js`<br>*(OTP verification & reset routes)* | **Brute-Forceable OTP**: OTP is generated as 3 random bytes in hex (6 hex chars, ~16.7M entropy) with no attempt counter, no lock-out, and no invalidation on repeated failures. | Use 6-digit numeric OTP (`crypto.randomInt(100000, 1000000)`). Track `otpAttempts` on `User` schema (limit to 5 attempts, then invalidate). Add rate limiting and constant generic response for non-existent emails. |
| **S8** | **P0** | All 3 services (`Login`, `Genai`, `TempFile`) | **Absence of Rate Limiting**: All sensitive endpoints (login, register, OTP verification, Gemini inference, code sharing) lack rate limiting. | Add `express-rate-limit` to Login microservice (strict limits on `/api/login`, `/api/verify-otp`, `/api/resend-otp`), add `Flask-Limiter` on Flask microservices, and configure per-user rate quotas on GenAI routes. |
| **S9** | **P1** | `Backend/Login/config/corsOptions.js`<br>`Backend/Genai/app.py`<br>`Backend/TempFile/app.py` | **Permissive CORS Policy**: `origin: '*'` configured alongside `credentials: true`. Allows arbitrary origins to make requests from browser contexts. | Read allowed origins from `process.env.ALLOWED_ORIGINS` (comma-separated list). Disallow wildcard origins when credentials are enabled. |
| **S10** | **P1** | `Backend/Login/server.js`<br>*(verify-otp lines 407-411, change-password lines 993-999)* | **Immortal JWTs**: Tokens issued upon OTP verification and password changes omit the `expiresIn` option, creating never-expiring credentials. | Centralize JWT signing in a single helper (`generateToken`) enforcing standard expiration (e.g. `7d` or `1w`). |
| **S11** | **P1** | `Backend/Genai/utils.py`<br>`Backend/TempFile/utils.py`<br>*(`@token_required`)* | **Unrevoked Token Trust**: Flask services rely solely on cryptographic validation of stateless JWTs. Deleted, deactivated, or revoked users remain authenticated. | Implement token versioning (`tokenVersion`), short-lived tokens with refresh rotation, or a revocation blacklist in Redis. |
| **S12** | **P1** | `Backend/Login/server.js`<br>*(POST `/api/auth/google`, ~line 265)* | **Unverified Email Linking Vulnerability**: Does not verify `payload.email_verified` before linking Google identity to existing email accounts. | Verify `payload.email_verified === true` before authenticating or account linking; reject otherwise. |
| **S13** | **P1** | `Frontend/src/pages/Login.jsx`<br>*(and related frontend components)* | **JWT Stored in LocalStorage**: JWT stored in browser `localStorage` is vulnerable to exfiltration via Cross-Site Scripting (XSS). | Transition to `httpOnly; Secure; SameSite=Strict` cookies or enforce strict Content Security Policy (CSP) and minimize token lifetimes. |
| **S14** | **P1** | `Backend/Login/server.js`<br>*(register, login, forgot password routes)* | **Account Enumeration**: Verbose messages like "Email already in use" and "User not found" allow attackers to discover valid user emails. | Return uniform, ambiguous responses (e.g., "If this email is registered, instructions have been sent"). |
| **S15** | **P1** | `Backend/Login/server.js`<br>*(header & middleware setup)* | **Missing HTTP Security Headers & Redundant Parsers**: Missing `helmet`; redundant and conflicting body parsers (`express.json()` and `bodyParser.json({limit:'200kb'})`). | Integrate `helmet()`, remove duplicate `body-parser`, and configure uniform `express.json({ limit: '200kb' })`. |
| **S16** | **P2** | Configuration (`.env`, all services) | **Shared JWT Secret**: All services use a single shared `JWT_SECRET`. A breach in one service compromises all services. | Utilize high-entropy secret (>=64 bytes), manage via secret management systems, and prepare asymmetric signing (RS256/ES256) for multi-service verification. |
| **S17** | **P2** | `Backend/Genai/app.py` | **Prompt Injection & Input Unboundedness**: User code and instructions are injected into Gemini prompts with potential delimiter leakage or unexpected instruction overrides. | Cap input sizes (`MAX_SIZE`), enforce structured system prompts, sanitize delimiters, and guarantee generated code is never evaluated server-side without a sandbox. |

---

## Detailed Remediation Blueprint

### S1: Secure Code Run Counter
* **File**: `Backend/Login/server.js`
* **Change**:
```javascript
app.post('/api/runCode/count', verifyRecaptcha, async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ msg: 'Authorization token required' });
    }
    const { language } = req.body;
    try {
        await checkAndConnectDB();
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ msg: 'User not found' });
        if (!updateLanguageCount(user, 'runCodeCount', language)) {
            return res.status(400).json({ msg: 'Unsupported language' });
        }
        await logUserAction(user, 'update');
        await user.save();
        return res.status(204).send();
    } catch (err) {
        return res.status(401).json({ msg: 'Invalid or expired token' });
    }
});
```
* **Frontend**: Update `Frontend/src/components/CodeEditor.jsx` (`getRunCodeCount`) to include `Authorization: Bearer ${token}`.

---

### S2 & S3: Secure Shared Link Deletion
* **File**: `Backend/Login/server.js`
* **Change**:
```javascript
app.delete('/api/user/sharedLink/:shareId', verifyRecaptcha, async (req, res) => {
    const { shareId } = req.params;
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ msg: 'Authorization token required' });
    }
    try {
        await checkAndConnectDB();
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const linkIndex = user.sharedLinks.findIndex(link => link.shareId === shareId);
        if (linkIndex === -1) {
            return res.status(404).json({ msg: 'Shared link not found' });
        }

        user.sharedLinks.splice(linkIndex, 1);
        await logUserAction(user, 'update');
        await user.save();

        return res.status(200).json({ msg: 'Shared link deleted successfully' });
    } catch (err) {
        return res.status(401).json({ msg: 'Invalid or expired token' });
    }
});
```
* **Frontend**: Ensure `Frontend/src/components/SharedLinks.jsx` passes `Authorization: Bearer ${token}` on delete requests. Deprecate unauthenticated `/api/sharedLink` route or enforce the exact same user ownership check.

---

### S4: Authorize TempFile Redis Record Deletion
* **File**: `Backend/TempFile/app.py`
* **Change**:
```python
# In save_file():
file_data = {
    "title": title,
    "code": code,
    "language": language,
    "expiry_time": formatted_expiry_time,
    "userId": request.user_data.get("userId")  # Store owner ID
}

# In delete_file(file_id):
raw_data = redis_client.get(file_key)
if not raw_data:
    return jsonify({"error": "File not found"}), 404

file_data = json.loads(raw_data)
if file_data.get("userId") != request.user_data.get("userId"):
    logging.warning(f"Unauthorized deletion attempt by user {request.user_data.get('userId')}")
    return jsonify({"error": "Forbidden: You are not authorized to delete this file"}), 403

redis_client.delete(file_key)
return jsonify({"message": "File deleted successfully"}), 200
```

---

### S5: Authenticate AI Output Evaluation Route
* **File**: `Backend/Genai/app.py`
* **Change**:
```python
@app.route("/get-output", methods=["POST"])
@token_required
def get_output_api():
    # Requires valid JWT
    ...
```
* **Frontend**: Pass `Authorization: Bearer ${token}` header from `Frontend/src/components/CodeEditor.jsx`.

---

### S6: Fail-Closed Production reCAPTCHA
* **Node.js** (`Backend/Login/middlewares/verifyRecaptcha.js`):
```javascript
const secretKey = process.env.RECAPTCHA_SECRET_KEY;
if (!secretKey) {
    if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({ msg: "reCAPTCHA configuration error in production." });
    }
    return next(); // Dev only
}
```
* **Flask** (`Backend/Genai/utils.py`, `Backend/TempFile/utils.py`):
```python
if not RECAPTCHA_SECRET_KEY:
    if os.getenv("FLASK_ENV") == "production" or os.getenv("NODE_ENV") == "production":
        logging.error("reCAPTCHA secret missing in production!")
        return False
    return True
```

---

### S7: Secure OTP Generation & Attempt Throttling
1. **6-Digit Generation**:
```javascript
// Backend/Login/utils/otpGenerator.js
const crypto = require('node:crypto');

function generateOtp() {
    return crypto.randomInt(100000, 1000000).toString();
}

module.exports = { generateOtp };
```
2. **Schema & Verification**:
   * Add `otpAttempts: { type: Number, default: 0 }` to `User` schema.
   * If `user.otpAttempts >= 5`: clear `user.otp`, `user.otpExpires`, and return `429 Too many failed attempts. Please request a new OTP.`
   * On failure: `user.otpAttempts += 1; await user.save();`
   * On success: `user.otpAttempts = 0; user.otp = null; user.otpExpires = null;`

---

### S8: Rate Limiting
* Install `express-rate-limit` in `Backend/Login`:
```javascript
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts
    standardHeaders: true,
    legacyHeaders: false,
    message: { msg: 'Too many attempts from this IP. Please try again after 15 minutes.' }
});

app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);
app.use('/api/verify-otp', authLimiter);
app.use('/api/resend-otp', authLimiter);
app.use('/api/reset-password', authLimiter);
```

---

### S9: Strict CORS Configuration
* `Backend/Login/config/corsOptions.js`:
```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : ['http://localhost:5173'];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Blocked by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-recaptcha-token'],
    credentials: true,
};

module.exports = corsOptions;
```

---

### S10: Centralized JWT Utility with Expiration
```javascript
// Backend/Login/utils/token.js
const jwt = require('jsonwebtoken');

function generateToken(userId, expiresIn = '7d') {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        {
            algorithm: 'HS512',
            expiresIn
        }
    );
}

module.exports = { generateToken };
```
Replace all disparate `jwt.sign()` calls across `server.js` with `generateToken(user._id)`.

---

### S12: Google OAuth Email Verification Guard
```javascript
// Backend/Login/server.js (/api/auth/google)
const { email, name, sub: googleId, email_verified } = payload;

if (!email_verified) {
    return res.status(403).json({
        message: 'Google email address is not verified.'
    });
}
```

---

### S15: Security Headers & Body Parser Sanitization
```javascript
// Backend/Login/server.js
const helmet = require('helmet');

app.use(helmet());
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));
```

---

## Remediation Progress Checklist

- [x] **Phase 1: P0 Critical Vulnerabilities**
  - [x] S1: Require JWT for `/api/runCode/count`
  - [x] S2: Authenticate and restrict `/api/sharedLink` deletion
  - [x] S3: Remove optional token fallback in `/api/user/sharedLink/:shareId`
  - [x] S4: Enforce owner check on Redis file deletion
  - [x] S5: Add `@token_required` to `/get-output`
  - [x] S6: Fail closed on missing reCAPTCHA secret in production
  - [x] S7: 6-digit numeric OTP with 5-attempt lockout
  - [x] S8: Integrate rate limiters across all microservices
- [ ] **Phase 2: P1 High Vulnerabilities**
  - [ ] S9: Dynamic allowed origins in CORS
  - [ ] S10: Centralize JWT generation with mandatory expiration
  - [ ] S11: Token validity / revocation strategy
  - [ ] S12: Check `email_verified` on Google OAuth login
  - [ ] S13: Harden client token storage & CSP
  - [ ] S14: Mitigate account enumeration in responses
  - [ ] S15: Add `helmet` and streamline body parsers
- [ ] **Phase 3: P2 Hardening & Quality**
  - [ ] S16: Strengthen and rotate JWT secrets
  - [ ] S17: Enforce input bounds and prompt injection safeguards
