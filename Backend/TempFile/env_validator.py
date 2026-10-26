import os
import logging

def validate_env():
    """
    Startup Environment Validator for TempFile Service.
    Validates presence of critical environment variables and warns about missing optional ones.
    """
    if os.getenv("FLASK_ENV") == "test" or os.getenv("APP_ENV") == "test":
        return True, [], []

    required = ["REDIS_HOST", "JWT_SECRET", "RECAPTCHA_SECRET_KEY", "ALLOWED_ORIGINS", "TEMP_FILE_URL"]
    optional = ["REDIS_PORT", "REDIS_PASSWORD", "REDIS_SSL", "PORT"]

    missing_required = [key for key in required if not os.getenv(key) or not os.getenv(key).strip()]
    missing_optional = [key for key in optional if not os.getenv(key) or not os.getenv(key).strip()]

    if missing_optional:
        logging.info(f"[TempFile Service] Notice: Optional environment variables not set (using defaults): {', '.join(missing_optional)}")

    if missing_required:
        logging.error(f"[TempFile Service] ❌ Missing required environment variables:\n  - " + "\n  - ".join(missing_required))
        is_production = (
            os.getenv("APP_ENV") == "production"
            or os.getenv("FLASK_ENV") == "production"
            or os.getenv("NODE_ENV") == "production"
        )
        if is_production:
            raise RuntimeError(f"FATAL: Missing required production environment variables: {', '.join(missing_required)}")
        else:
            logging.warning("[TempFile Service] ⚠️ Running in development with missing required variables. File sharing may fail.")
        return False, missing_required, missing_optional

    logging.info("[TempFile Service] ✅ Environment variables validated successfully.")
    return True, missing_required, missing_optional
