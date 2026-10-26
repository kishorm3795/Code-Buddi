# Code-Buddi

An online IDE with secure login functionality that allows users to run code, generate new code, refactor existing code, and share it with anyone.

![Homepage](Images/Homepage.png)

![Lines of code](https://sloc.xyz/github/kishorm3795/Code-Buddi)

## Environment Variables Reference

Each service maintains its own dedicated `.env.example` file with startup validation:
- [`Frontend/.env.example`](Frontend/.env.example)
- [`Backend/Login/.env.example`](Backend/Login/.env.example)
- [`Backend/Genai/.env.example`](Backend/Genai/.env.example)
- [`Backend/TempFile/.env.example`](Backend/TempFile/.env.example)
- Master root template: [`.env.example`](.env.example)

### Frontend (`Frontend/.env`)
| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_GATEWAY_URL` | Optional | `""` (relative) | Base URL of API Gateway / reverse proxy. Leave empty when behind Nginx/Caddy proxy. |
| `VITE_BACKEND_API_URL` | Optional | `http://localhost:5003` | Fallback direct URL to Login service when no API Gateway is present. |
| `VITE_GEMINI_API_URL` | Optional | `http://localhost:5001` | Fallback direct URL to GenAI service when no API Gateway is present. |
| `VITE_TEMP_SHARE_URL` | Optional | `http://localhost:5002` | Fallback direct URL to TempFile service when no API Gateway is present. |
| `VITE_RECAPTCHA_SITE_KEY` | Recommended | None | Google reCAPTCHA v3 public site key for bot verification. |
| `VITE_GOOGLE_CLIENT_ID` | Recommended | None | Google OAuth 2.0 Web Client ID for Google Sign-In. |
| `VITE_LOG_LEVEL` | Optional | `INFO` | Client console logging verbosity (`DEBUG`, `INFO`, `WARN`, `ERROR`). |

### Backend - Login Service (`Backend/Login/.env`)
| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | Optional | `5003` | Port on which the Login Express server listens. |
| `NODE_ENV` | Optional | `development` | Runtime environment (`development`, `production`, `test`). |
| `MONGO_URI` | **Required** | `mongodb://127.0.0.1:27017/codebuddi` | MongoDB connection string (local or MongoDB Atlas SRV URI). |
| `JWT_SECRET` | **Required** | None | HS512 cryptographic key used to sign session JWTs. Must match Genai and TempFile. |
| `RECAPTCHA_SECRET_KEY` | **Required (Prod)** | None | Google reCAPTCHA v3 secret key used to verify client tokens. |
| `GOOGLE_CLIENT_ID` | Optional | None | Google OAuth 2.0 Client ID for server-side ID token verification. |
| `OTP_EMAIL_SERVICE` | Optional | `gmail` | Nodemailer service provider name for sending OTP emails. |
| `OTP_EMAIL_USER` | Optional | None | Sender email address for 6-digit OTP delivery (in dev, OTP prints to console if empty). |
| `OTP_EMAIL_PASS` | Optional | None | App password for SMTP sender account. |
| `ALLOWED_ORIGINS` | **Required (Prod)** | `http://localhost:5173` | Comma-separated list of allowed frontend origins for CORS. |
| `LOG_LEVEL` | Optional | `info` | Pino logger level (`debug`, `info`, `warn`, `error`). |

### Backend - Genai Service (`Backend/Genai/.env`)
| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | Optional | `5001` | Port on which the Genai Flask server listens. |
| `FLASK_ENV` | Optional | `development` | Flask runtime environment (`development`, `production`). |
| `GEMINI_API_KEY` | **Required** | None | Google Gemini API key obtained from Google AI Studio. |
| `GEMINI_MODEL` | Optional | `gemini-2.5-pro` | Gemini model for code generation and refactoring. |
| `GEMINI_MODEL_1` | Optional | `gemini-2.5-flash` | Secondary fast Gemini model for lightweight tasks. |
| `JWT_SECRET` | **Required** | None | HS512 JWT verification key (must match Login service). |
| `RECAPTCHA_SECRET_KEY` | **Required (Prod)** | None | Google reCAPTCHA v3 secret key for rate/bot limiting. |
| `ALLOWED_ORIGINS` | **Required (Prod)** | `http://localhost:5173` | Comma-separated list of allowed CORS origins. |

### Backend - TempFile Service (`Backend/TempFile/.env`)
| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | Optional | `5002` | Port on which the TempFile Flask server listens. |
| `FLASK_ENV` | Optional | `development` | Flask runtime environment (`development`, `production`). |
| `APP_ENV` | Optional | `development` | Application mode flag (`development`, `production`). |
| `TEMP_FILE_URL` | **Required (Prod)**| `http://localhost:5002` | Base URL used when formatting shareable snippet links. |
| `REDIS_HOST` | **Required (Prod)**| `localhost` | Redis host (or container hostname `redis`, or Upstash domain). |
| `REDIS_PORT` | Optional | `6379` | Redis port number. |
| `REDIS_PASSWORD` | Optional | `""` | Redis authentication password/token (blank for unauthenticated local Redis). |
| `REDIS_SSL` | Optional | `false` | Enable TLS encryption (`true` for Upstash / Redis Cloud). |
| `JWT_SECRET` | **Required** | None | HS512 JWT verification key (must match Login service). |
| `RECAPTCHA_SECRET_KEY` | **Required (Prod)** | None | Google reCAPTCHA v3 secret key for upload verification. |
| `ALLOWED_ORIGINS` | **Required (Prod)** | `http://localhost:5173` | Comma-separated list of allowed CORS origins. |

## Diagram

![Diagram](Images/Diagram.png)

## Frontend Dependencies:
- **[monaco-editor](https://microsoft.github.io/monaco-editor/)**: A fast code editor React wrapper, commonly used in applications like Visual Studio Code.
- **[lodash](https://lodash.com/)**: A utility library with helpful functions for working with arrays, objects, and other JavaScript data types.
- **[react](https://reactjs.org/)**: A JavaScript library for building declarative, component-based user interfaces.
- **[react-icons](https://react-icons.github.io/react-icons/)**: A collection of customizable icons for React applications.
- **[react-router](https://reactrouter.com/)**: A library for adding dynamic routing and navigation capabilities to React applications.
- **[terser](https://github.com/terser/terser)**: A fast JavaScript minifier used with bundlers like Rollup to optimize file sizes.
- **[sweetalert2](https://sweetalert2.github.io/)**: A customizable library for creating responsive, beautiful popup alerts in JavaScript applications.
- **[sass](https://github.com/sass/sass)**: A modern version of Sass embedded for improved performance and support for advanced CSS features.
- **[tailwindcss](https://tailwindcss.com/)**: A utility-first CSS framework designed for rapid styling with predefined classes.
- **[tailwindcss-motion](https://github.com/romboHQ/tailwindcss-motion)**: A plugin for adding animations and transitions to Tailwind CSS projects.
- **[vite](https://vitejs.dev/)**: A fast build tool and development server for modern frontend development, featuring hot module replacement (HMR).
- **[react-oauth/google](https://www.npmjs.com/package/@react-oauth/google)**: A React wrapper for Google OAuth integration, providing easy authentication with Google accounts.
- **[react-google-recaptcha-v3](https://www.npmjs.com/package/react-google-recaptcha-v3)**: A React component for integrating Google reCAPTCHA v3 to protect your application from spam and abuse.

## Backend Dependencies:
- **[bcryptjs](https://github.com/dcodeIO/bcrypt.js)**: A JavaScript library for securely hashing passwords using the bcrypt algorithm.
- **[body-parser](https://github.com/expressjs/body-parser)**: Middleware to parse incoming request bodies in JSON or URL-encoded format.  
- **[cors](https://expressjs.com/en/resources/middleware/cors.html)**: A Node.js package that enables Cross-Origin Resource Sharing (CORS) for handling requests from different origins.
- **[dotenv](https://dotenvx.com/)**: A module that loads environment variables from a `.env` file into `process.env`.
- **[express](https://expressjs.com/)**: A minimal and flexible Node.js web framework for building web and mobile applications.
- **[jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)**: A library for creating and verifying JSON Web Tokens (JWT) to securely transmit data between parties.
- **[mongoose](https://mongoosejs.com/)**: A MongoDB Object Data Modeling (ODM) library for Node.js, offering schema-based data modeling.
- **[crypto](https://nodejs.org/api/crypto.html)**: A Node.js core module that provides cryptographic functionality, such as hashing, HMAC, and encryption.
- **[nodemailer](https://nodemailer.com/)**: A module for sending emails from Node.js applications using SMTP, with support for attachments and HTML content.
- **[path](https://nodejs.org/api/path.html)**: A Node.js core module for working with file and directory paths.
- **[axios](https://axios-http.com/)**: A popular promise-based HTTP client for making requests from Node.js and browsers, often used for interacting with APIs.
- **[google-auth-library](https://github.com/googleapis/google-auth-library-nodejs)**: A library for authenticating with Google services, used to handle OAuth 2.0 authorization in Node.js.

## Python Libraries:
- **[google-genai](https://ai.google.dev/gemini-api/docs/quickstart?lang=python)**: A collection of Google APIs and tools for integrating generative AI models into applications.
- **[python-dotenv](https://pypi.org/project/python-dotenv/)**: A Python library for loading environment variables from a `.env` file into the environment.
- **[flask_cors](https://flask-cors.readthedocs.io/en/latest/)**: A Flask extension to handle Cross-Origin Resource Sharing (CORS) and allow requests from different origins.
- **[flask](https://flask.palletsprojects.com/)**: A lightweight Python web framework used for building web applications.
- **[os](https://docs.python.org/3/library/os.html)**: A module in Python providing a way of using operating system-dependent functionality, such as reading or writing to the file system.
- **[re](https://docs.python.org/3/library/re.html)**: A module in Python used for working with regular expressions, allowing pattern matching and text manipulation.
- **[redis](https://pypi.org/project/redis/)**: A Python client for interacting with Redis, an in-memory data structure store, used for caching, message brokering, and more.
- **[uuid](https://docs.python.org/3/library/uuid.html)**: A Python module for generating universally unique identifiers (UUIDs), useful for creating unique keys or identifiers.
- **[datetime](https://docs.python.org/3/library/datetime.html)**: A module in Python for manipulating dates and times, including working with time zones and formatting.
- **[pyjwt](https://pyjwt.readthedocs.io/en/stable/)**: A library for encoding and decoding JSON Web Tokens (JWT), commonly used for authentication in web applications.
- **[functools](https://docs.python.org/3/library/functools.html)**: A module in Python providing higher-order functions to work with functions and callable objects, such as `wraps`.
- **[requests](https://docs.python-requests.org/en/latest/)**: A simple HTTP library for Python, used for making HTTP requests like GET, POST, PUT, DELETE, etc., with ease and flexibility.
- **[logging](https://docs.python.org/3/library/logging.html)**: A built-in Python module that provides flexible logging of messages, helping to track application events, errors, and debug information.

## How to Set Up and Use

To set up and run:

### What You Need

- [Node.js](https://nodejs.org/) (latest version)
- npm (usually comes with Node.js)
- [Git](https://git-scm.com/) (version control system)
- [Python](https://www.python.org/) (latest version)
- [Pip](https://pip.pypa.io/en/stable/) Python package installer

## Clone the repository:
```bash
git clone --depth 1 https://github.com/kishorm3795/Code-Buddi.git
cd Code-Buddi
```

## Quick Start: Local Full-Stack with Docker Compose

Run the entire application stack (MongoDB, Redis, Login, GenAI, TempFile, Frontend & Nginx Gateway) with one command:

1. Copy `.env.example` to `.env` (or configure per-service `.env` files):
```bash
cp .env.example .env
```
2. Build and launch all services:
```bash
docker compose up --build
```
3. Access the application:
- **Frontend & Gateway**: `http://localhost` (or `http://localhost:80`)
- **Login Health**: `http://localhost:5003/health`
- **GenAI Health**: `http://localhost:5001/health`
- **TempFile Health**: `http://localhost:5002/health`

For complete cloud deployment instructions (MongoDB Atlas, Upstash Redis TLS, Render, Vercel, Netlify, Custom Domains), see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Manual Local Development Setup

## Backend Login

1. Go to the Backend/Login folder:
```
cd Backend/Login
```

2. Install dependencies:
```
npm install
```

3. Make sure the **.env** file is present and properly configured.

4. Run the server:
```
node server.js
```

### Note: 
Ensure that **Genai** and **TempFile** are assigned different ports.

*You can modify the port by:*
```python
if __name__ == "__main__":
    app.run(debug=False, port = <port>)
```

## GenAi

1. Go to the Backend/Genai folder:
```
cd Backend/Genai
```

2. Install packages:
```
pip install -r requirements.txt
```

3. Make sure the **.env** file is present and properly configured.

4. Run it:
```
python app.py
```

## TempFile

1. Go to the Backend/TempFile folder:
```
cd Backend/TempFile
```

2. Install packages:
```
pip install -r requirements.txt
```

3. Make sure the **.env** file is present and properly configured.

4. Run it:
```
python app.py
```

## Frontend

1. Go to the Frontend folder:
```
cd ./Frontend
```

2. Install dependencies:
```
npm install
```

3. Make sure the **.env** file is present and properly configured.

### For Development

To start working on the project:

```
npm run dev
```

This starts the development server. Open your web browser and go to `http://localhost:5173` (or the address shown in your terminal) to see the app.

### Building for Release

To make the project ready for release:

```
npm run build
```

This creates optimized files in the `dist` folder.

### Looking at the Release Version

To see how the release version looks:

```
npm run preview
```

# Screenshots

### Homepage
![Homepage](Images/Homepage.png)

### HTML, CSS, JS
![HTML, CSS, JS](Images/HtmlCssJs.png)

### Python
![Python](Images/Python.png)

### JavaScript
![JavaScript](Images/Javascript.png)

### C
![C](Images/C.png)

### C++
![C++](Images/Cplusplus.png)

### Java
![Java](Images/Java.png)

### C#
![C#](Images/CSharp.png)

### Rust
![Rust](Images/Rust.png)

### Go
![Go](Images/Go.png)

### Verilog
![Verilog](Images/Verilog.png)

### SQL
![SQL](Images/Sql.png)

### MongoDB
![MongoDB](Images/MongoDB.png)

### Swift
![Swift](Images/Swift.png)

### Typescript
![Typescript](Images/Typescript.png)

### Dart
![Dart](Images/Dart.png)

### Kotlin
![Kotlin](Images/Kotlin.png)

### Perl
![Perl](Images/Perl.png)

### Scala
![Scala](Images/Scala.png)

### Julia
![Julia](Images/Julia.png)

### Accounts
![Accounts](Images/Accounts.png)

### Login
![Login](Images/Login.png)

### Register
![Register](Images/Register.png)

## License & Attribution
 
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.  
Originally based on [gladw-in/online-ide](https://github.com/gladw-in/online-ide).