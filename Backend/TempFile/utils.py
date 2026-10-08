import os
import jwt
import redis
import requests
import logging
from functools import wraps
from flask import request, jsonify
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(module)s - %(message)s"
)

SECRET_KEY = os.getenv("JWT_SECRET")
RECAPTCHA_SECRET_KEY = os.getenv("RECAPTCHA_SECRET_KEY")


class MockRedis:
    def __init__(self):
        self.data = {}
    def ping(self):
        return True
    def set(self, name, value, ex=None):
        self.data[name] = value
        return True
    def setex(self, name, time, value):
        self.data[name] = value
        return True
    def get(self, name):
        return self.data.get(name)
    def delete(self, name):
        if name in self.data:
            del self.data[name]
        return True
    def exists(self, name):
        return name in self.data
    def ttl(self, name):
        if name in self.data:
            return 100 # Mock TTL
        return -2
    def close(self):
        pass

def get_redis_connection():
    is_production = os.getenv("FLASK_ENV") == "production" or os.getenv("NODE_ENV") == "production"
    redis_host = os.getenv("REDIS_HOST")

    if not redis_host:
        if is_production:
            logging.error("FATAL: REDIS_HOST must be configured in production.")
            return None
        logging.info("Using Mock Redis (No REDIS_HOST configured - Development only)")
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
        logging.info("Successfully connected to Redis.")
        return redis_client
    except (redis.ConnectionError, redis.TimeoutError, Exception) as e:
        if is_production:
            logging.error(f"Failed to connect to Redis at {redis_host}: {e}")
            return None
        logging.warning(f"Failed to connect to Redis, falling back to Mock Redis in dev: {e}")
        return MockRedis()


def is_human(recaptcha_token):
    is_production = os.getenv("FLASK_ENV") == "production" or os.getenv("NODE_ENV") == "production"

    if not RECAPTCHA_SECRET_KEY:
        if is_production:
            logging.error("reCAPTCHA check failed: Secret key is missing in production.")
            return False
        logging.info("reCAPTCHA check skipped: Secret key is missing in development.")
        return True

    if not recaptcha_token:
        logging.warning("reCAPTCHA check failed: Token is missing.")
        return False

    payload = {"secret": RECAPTCHA_SECRET_KEY, "response": recaptcha_token}

    try:
        response = requests.post(
            "https://www.google.com/recaptcha/api/siteverify", data=payload, timeout=50
        )
        response.raise_for_status()
        result = response.json()

        if result.get("success") and result.get("score", 0) > 0.5:
            logging.info(
                f"reCAPTCHA verification successful. Score: {result.get('score')}"
            )
            return True
        else:
            logging.warning(f"reCAPTCHA verification failed. Result: {result}")
            return False

    except requests.exceptions.RequestException as e:
        logging.error(f"reCAPTCHA request to Google failed: {e}")
        return False


def token_required(f):
    @wraps(f)
    def decorator(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]

        if not token:
            logging.warning("Access attempt without an Authorization token.")
            return jsonify({"message": "Token is missing!"}), 403

        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS512"])
            request.user_data = decoded
            logging.info("Token successfully decoded.")
        except jwt.InvalidTokenError as e:
            logging.warning(f"Invalid token received: {e}")
            return jsonify({"message": "Invalid token!"}), 401

        return f(*args, **kwargs)

    return decorator
