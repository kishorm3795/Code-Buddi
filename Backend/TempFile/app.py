import os
import sys
import uuid
import json
import re
import logging
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()

from flask import (
    Flask,
    abort,
    request,
    jsonify,
    render_template,
)
from werkzeug.exceptions import HTTPException
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from pythonjsonlogger import jsonlogger
import redis

from utils import (
    MockRedis,
    get_redis_connection,
    get_redis_pool,
    set_redis_client,
    reset_redis_connection,
    is_human,
    token_required,
)

# Configure structured logging
logHandler = logging.StreamHandler(sys.stdout)
formatter = jsonlogger.JsonFormatter(
    '%(asctime)s %(levelname)s %(name)s %(message)s'
)
logHandler.setFormatter(formatter)

logging.basicConfig(
    level=logging.INFO,
    handlers=[logHandler]
)

app = Flask(__name__)

# Size limit: 0.5 MB (524,288 bytes)
MAX_UPLOAD_SIZE = int(0.5 * 1024 * 1024)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_SIZE

limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["200 per day", "60 per hour"],
    storage_uri="memory://",
)

@app.errorhandler(413)
def request_entity_too_large(e):
    logging.warning("Request payload exceeded 0.5 MB limit.")
    return jsonify({"error": "Payload exceeds the 0.5 MB limit."}), 413


# Allowed language allowlist
ALLOWED_LANGUAGES = {
    "c",
    "cpp",
    "csharp",
    "dart",
    "go",
    "htmlcssjs",
    "java",
    "javascript",
    "julia",
    "kotlin",
    "mongodb",
    "perl",
    "python",
    "ruby",
    "rust",
    "scala",
    "sql",
    "swift",
    "typescript",
    "verilog",
}

# Share ID validation pattern: language-uuid
SHARE_ID_REGEX = re.compile(
    r"^([a-zA-Z0-9]+)-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$",
    re.IGNORECASE,
)

# CORS restriction to ALLOWED_ORIGINS
raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost,http://localhost:80,http://127.0.0.1:80,http://127.0.0.1",
)
allowed_origins = [
    origin.strip()
    for origin in raw_origins.split(",")
    if origin.strip() and origin.strip() != "*"
]
CORS(app, origins=allowed_origins, supports_credentials=True)

is_production = (
    os.getenv("APP_ENV") == "production"
    or os.getenv("FLASK_ENV") == "production"
    or os.getenv("NODE_ENV") == "production"
)

if is_production:
    if not os.getenv("RECAPTCHA_SECRET_KEY"):
        raise RuntimeError("FATAL: RECAPTCHA_SECRET_KEY must be configured in production.")
    if not os.getenv("REDIS_HOST"):
        raise RuntimeError("FATAL: REDIS_HOST must be configured in production.")
    test_client = get_redis_connection()
    if not test_client or isinstance(test_client, MockRedis):
        raise RuntimeError(
            "FATAL: Failed to connect to Redis at startup in production. In-memory MockRedis fallback is prohibited."
        )

TEMP_FILE_URL = os.getenv("TEMP_FILE_URL", "http://localhost:5002")


@app.route("/", methods=["GET"])
def index():
    logging.info("Serving index page.")
    return render_template("index.html")


@app.route("/temp-file-upload", methods=["POST"])
@limiter.limit("30 per minute")
@token_required
def upload_file():
    logging.info("Received request to /temp-file-upload")
    token = request.headers.get("X-Recaptcha-Token")

    if not is_human(token):
        logging.warning("reCAPTCHA verification failed for upload request.")
        abort(403, description="reCAPTCHA verification failed.")

    redis_client = get_redis_connection()
    if not redis_client:
        logging.error("Could not connect to Redis.")
        return jsonify({"error": "Failed to connect to Redis"}), 503

    try:
        data = request.get_json()

        if (
            not data
            or not data.get("code")
            or not data.get("language")
            or not data.get("title")
            or not data.get("expiryTime")
        ):
            logging.warning("Upload request missing required fields.")
            return (
                jsonify(
                    {"error": "Code, language, title, and expiry time are required"}
                ),
                400,
            )

        code = data["code"]
        language = str(data["language"]).strip().lower()
        title = str(data["title"]).strip()

        # Validate upload code size against 0.5 MB limit
        if len(code.encode("utf-8")) > MAX_UPLOAD_SIZE:
            logging.warning("Upload code content exceeds 0.5 MB limit.")
            return jsonify({"error": "Code content exceeds the 0.5 MB limit."}), 413

        # Validate language allowlist
        if language not in ALLOWED_LANGUAGES:
            logging.warning(f"Invalid language provided: {language}")
            return (
                jsonify({"error": f"Invalid language '{language}'. Must be one of the allowed languages."}),
                400,
            )

        valid_expiry_times = (10, 30, 60, 1440, 10080)
        try:
            expiry_time_minutes = int(data["expiryTime"])
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid expiry time. Please choose a valid value."}), 400

        if expiry_time_minutes not in valid_expiry_times:
            logging.warning(f"Invalid expiry time received: {expiry_time_minutes}")
            return (
                jsonify({"error": "Invalid expiry time. Please choose a valid value."}),
                400,
            )

        # Timezone-aware UTC time
        current_time = datetime.now(timezone.utc)
        expiry_time = current_time + timedelta(minutes=expiry_time_minutes)
        formatted_expiry_time = expiry_time.strftime("%Y-%m-%d %H:%M:%S UTC")

        file_id = str(uuid.uuid4())
        user_id = (
            request.user_data.get("userId")
            if hasattr(request, "user_data") and request.user_data
            else None
        )

        file_data = {
            "title": title,
            "code": code,
            "language": language,
            "expiry_time": formatted_expiry_time,
            "userId": user_id,
        }

        redis_client.set(
            f"file:{language}-{file_id}:data",
            json.dumps(file_data),
            ex=expiry_time_minutes * 60,
        )

        file_url = f"{TEMP_FILE_URL}/file/{language}-{file_id}"
        logging.info(f"Successfully created file {language}-{file_id}")

        return jsonify(
            {
                "message": "Code uploaded successfully",
                "fileUrl": file_url,
                "expiry_time": formatted_expiry_time,
            }
        )

    except (redis.ConnectionError, redis.TimeoutError) as e:
        logging.error(f"Redis connection error during file upload: {e}")
        return jsonify({"error": "Failed to connect to Redis"}), 503

    except redis.RedisError as e:
        logging.error(f"Redis error during file upload: {e}")
        return jsonify({"error": "Failed to store code in Redis"}), 500

    except HTTPException:
        raise

    except Exception as e:
        logging.error(f"Unexpected error during file upload: {e}")
        return jsonify({"error": "An unexpected error occurred"}), 500


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint for TempFile service."""
    # Check Redis connection
    try:
        redis_client = get_redis_connection()
        if redis_client:
            redis_client.ping()
            redis_healthy = True
            redis_error = None
        else:
            redis_healthy = False
            redis_error = "Failed to connect to Redis"
    except Exception as e:
        redis_healthy = False
        redis_error = str(e)

    jwt_configured = bool(os.getenv("JWT_SECRET"))
    is_prod = (
        os.getenv("APP_ENV") == "production"
        or os.getenv("FLASK_ENV") == "production"
        or os.getenv("NODE_ENV") == "production"
    )
    recaptcha_configured = bool(os.getenv("RECAPTCHA_SECRET_KEY")) if is_prod else True

    is_healthy = redis_healthy and jwt_configured and recaptcha_configured

    return jsonify({
        "status": "healthy" if is_healthy else "unhealthy",
        "service": "tempfile",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "checks": {
            "redis_connection": {
                "healthy": redis_healthy,
                "error": redis_error if not redis_healthy else None,
            },
            "jwt_secret_configured": jwt_configured,
            "recaptcha_configured": recaptcha_configured if is_prod else "skipped_in_dev",
        },
    }), 200 if is_healthy else 503


@app.route("/file/<shareId>", methods=["GET"])
@limiter.limit("60 per minute")
def get_file(shareId):
    logging.info(f"Received request to get file: {shareId}")

    # Validate shareId format (language-uuid)
    match = SHARE_ID_REGEX.match(shareId)
    if not match:
        logging.warning(f"Invalid shareId format received: {shareId}")
        return (
            jsonify(
                {
                    "error": "Invalid 'shareId' format. It should be 'language-file_id' with a valid UUID."
                }
            ),
            400,
        )

    language = match.group(1).lower()
    file_id = match.group(2).lower()

    if language not in ALLOWED_LANGUAGES:
        logging.warning(f"Invalid language in shareId: {language}")
        return (
            jsonify({"error": f"Invalid language '{language}' in shareId."}),
            400,
        )

    redis_client = get_redis_connection()
    if not redis_client:
        logging.error("Could not connect to Redis.")
        return jsonify({"error": "Failed to connect to Redis"}), 503

    try:
        file_key = f"file:{language}-{file_id}:data"
        file_data = redis_client.get(file_key)
        ttl = redis_client.ttl(file_key)

        if ttl == -2 or file_data is None:
            logging.info(f"File not found for key: {file_key}")
            return jsonify({"error": "File not found"}), 404
        elif ttl == -1 or ttl == 0:
            logging.info(f"File has expired for key: {file_key}")
            return jsonify({"error": "File has expired"}), 410

        file_dict = json.loads(file_data)
        logging.info(f"Successfully retrieved file: {file_key}")

        response = jsonify(file_dict)
        response.headers["Cache-Control"] = "no-store"
        return response, 200

    except (redis.ConnectionError, redis.TimeoutError) as e:
        logging.error(f"Redis connection error during file retrieval: {e}")
        return jsonify({"error": "Failed to connect to Redis"}), 503

    except redis.RedisError as e:
        logging.error(f"Redis error during file retrieval: {e}")
        return jsonify({"error": "Failed to retrieve code from Redis"}), 500

    except HTTPException:
        raise

    except Exception as e:
        logging.error(f"Unexpected error during file retrieval: {e}")
        return jsonify({"error": "An unexpected error occurred"}), 500


@app.route("/file/<file_id>/delete", methods=["DELETE"])
@limiter.limit("30 per minute")
@token_required
def delete_file(file_id):
    logging.info(f"Received request to delete file: {file_id}")
    token = request.headers.get("X-Recaptcha-Token")

    if not is_human(token):
        logging.warning("reCAPTCHA verification failed for delete request.")
        abort(403, description="reCAPTCHA verification failed.")

    redis_client = get_redis_connection()
    if not redis_client:
        logging.error("Could not connect to Redis.")
        return jsonify({"error": "Failed to connect to Redis"}), 503

    try:
        if "-" not in file_id:
            logging.warning(f"Invalid file_id format: {file_id}")
            return jsonify({"error": "Invalid file ID format"}), 400

        language, file_id_part = file_id.split("-", 1)
        file_key = f"file:{language}-{file_id_part}:data"

        raw_data = redis_client.get(file_key)
        if not raw_data:
            logging.warning(f"Attempted to delete a non-existent file: {file_key}")
            return jsonify({"error": "File not found"}), 404

        try:
            file_data = json.loads(raw_data)
        except Exception:
            file_data = {}

        file_owner = file_data.get("userId")
        current_user = (
            request.user_data.get("userId")
            if hasattr(request, "user_data") and request.user_data
            else None
        )

        if not current_user or file_owner != current_user:
            logging.warning(
                f"Unauthorized delete attempt on file {file_key} by user {current_user} (owner: {file_owner})"
            )
            return (
                jsonify({"error": "Forbidden: You are not authorized to delete this file"}),
                403,
            )

        redis_client.delete(file_key)
        logging.info(f"Successfully deleted file: {file_key}")
        return jsonify({"message": "File deleted successfully"}), 200

    except (redis.ConnectionError, redis.TimeoutError) as e:
        logging.error(f"Redis connection error during file deletion: {e}")
        return jsonify({"error": "Failed to connect to Redis"}), 503

    except redis.RedisError as e:
        logging.error(f"Redis error during file deletion: {e}")
        return jsonify({"error": "Failed to delete file from Redis"}), 500

    except HTTPException:
        raise

    except Exception as e:
        logging.error(f"Unexpected error during file deletion: {e}")
        return jsonify({"error": "An unexpected error occurred"}), 500


if __name__ == "__main__":
    app.run(debug=False, port=5002)
