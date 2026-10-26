import os
import logging

def validate_env():
    """
    Startup Environment Validator for Genai Service.
    Validates presence of critical environment variables and warns about missing optional ones.
    """
    if os.getenv("FLASK_ENV") == "test" or os.getenv("APP_ENV") == "test":
        return True, [], []

    required = ["GEMINI_API_KEY", "JWT_SECRET", "RECAPTCHA_SECRET_KEY", "ALLOWED_ORIGINS"]
    optional = ["PORT", "GEMINI_MODEL", "GEMINI_MODEL_1"]

    missing_required = [key for key in required if not os.getenv(key) or not os.getenv(key).strip()]
    missing_optional = [key for key in optional if not os.getenv(key) or not os.getenv(key).strip()]

    if missing_optional:
        logging.info(f"[Genai Service] Notice: Optional environment variables not set (using defaults): {', '.join(missing_optional)}")

    if missing_required:
        logging.error(f"[Genai Service] ❌ Missing required environment variables:\n  - " + "\n  - ".join(missing_required))
        is_production = os.getenv("FLASK_ENV") == "production" or os.getenv("NODE_ENV") == "production"
        if is_production:
            raise RuntimeError(f"FATAL: Missing required production environment variables: {', '.join(missing_required)}")
        else:
            logging.warning("[Genai Service] ⚠️ Running in development with missing required variables. AI calls will fail.")
        return False, missing_required, missing_optional

    logging.info("[Genai Service] ✅ Environment variables validated successfully.")
    return True, missing_required, missing_optional
