import os
import re
import logging
from dotenv import load_dotenv
from flask import (
    Flask,
    Response,
    abort,
    jsonify,
    render_template,
    request,
    stream_with_context,
)
from flask_cors import CORS
from google import genai
from google.genai import types
from prompts import *
from prompt_registry import registry
from utils import *

import json
import sys
from pythonjsonlogger import jsonlogger

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

load_dotenv()

app = Flask(__name__)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost,http://localhost:80,http://127.0.0.1:80,http://127.0.0.1"
    ).split(",")
    if origin.strip()
]
CORS(app, origins=allowed_origins, supports_credentials=True)

is_production = os.getenv("FLASK_ENV") == "production" or os.getenv("NODE_ENV") == "production"

if is_production and not os.getenv("RECAPTCHA_SECRET_KEY"):
    raise RuntimeError("FATAL: RECAPTCHA_SECRET_KEY must be configured in production.")

if not os.getenv("GEMINI_API_KEY"):
    if is_production:
        raise RuntimeError("FATAL: GEMINI_API_KEY must be configured in production.")
    else:
        logging.warning("GEMINI_API_KEY is not set. Gemini API calls will fail.")

gemini_model = os.getenv("GEMINI_MODEL") or "gemini-2.5-pro"
gemini_model_1 = os.getenv("GEMINI_MODEL_1") or "gemini-2.5-flash"


def stream_gemini_content(contents, system_instruction, model=None):
    """Unified streaming helper for Gemini text generation."""
    target_model = model or gemini_model

    def stream():
        try:
            client = genai.Client()
            response = client.models.generate_content_stream(
                model=target_model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                ),
            )
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            logging.error(f"Error during Gemini stream generation: {e}")
            yield f"\n[Generation Error: {str(e)}]"

    resp = Response(stream_with_context(stream()), mimetype="text/plain")
    resp.headers["X-AI-Simulated"] = "true"
    resp.headers["X-Simulation"] = "true"
    resp.headers["Access-Control-Expose-Headers"] = "X-AI-Simulated, X-Simulation"
    return resp


def get_generated_code(problem_description, language, prompt_version=None):
    contents = registry.format(
        "code:generate",
        _version=prompt_version,
        problem_description=problem_description,
        language=language,
    )
    system_instruction = registry.format(
        "instruction:generate",
        _version=prompt_version,
        language=language,
    )
    return stream_gemini_content(contents, system_instruction, model=gemini_model)


def get_output(code, language, prompt_version=None):
    prompt = registry.format(
        f"compiler:{language}",
        _version=prompt_version,
        code=code,
        time=utc_time_reference(),
    )
    system_instruction = registry.format(
        "instruction:compiler",
        _version=prompt_version,
        language=language,
    )
    return stream_gemini_content(prompt, system_instruction, model=gemini_model)


def refactor_code(code, language, output, problem_description=None, prompt_version=None):
    if problem_description:
        refactor_content = registry.format(
            "code:refactor_user",
            _version=prompt_version,
            code=code,
            language=language,
            problem_description=problem_description or "",
            output=output,
        )
    else:
        refactor_content = registry.format(
            "code:refactor",
            _version=prompt_version,
            code=code,
            language=language,
            output=output,
        )

    system_instruction = registry.format(
        "instruction:refactor",
        _version=prompt_version,
        language=language,
    )
    return stream_gemini_content(refactor_content, system_instruction, model=gemini_model)


def refactor_code_html_css_js(language, prompt, params, problem_description=None, prompt_version=None):
    try:
        if problem_description:
            formatted_prompt = prompt.format(
                **params, problem_description=problem_description
            )
        else:
            formatted_prompt = prompt.format(**params)

        client = genai.Client()
        system_instruction = registry.format(
            "instruction:refactor",
            _version=prompt_version,
            language=language,
        )

        response = client.models.generate_content(
            model=gemini_model_1,
            contents=formatted_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
            ),
        )

        result = response.text.strip()
        return result
    except Exception as e:
        logging.error(f"Error in refactor_code_html_css_js function: {e}")
        return f"Error: {e}"


def generate_html(prompt, prompt_version=None):
    formatted_prompt = registry.format(
        "web:html_generate",
        _version=prompt_version,
        prompt=prompt,
        time=utc_time_reference(),
    )
    system_instruction = registry.get("instruction:html_generate", version=prompt_version)
    return stream_gemini_content(
        contents=formatted_prompt,
        system_instruction=system_instruction,
        model=gemini_model_1,
    )


def generate_css(html_content, project_description, prompt_version=None):
    formatted_prompt = registry.format(
        "web:css_generate",
        _version=prompt_version,
        html_content=html_content,
        project_description=project_description,
        time=utc_time_reference(),
    )
    system_instruction = registry.get("instruction:css_generate", version=prompt_version)
    return stream_gemini_content(
        contents=formatted_prompt,
        system_instruction=system_instruction,
        model=gemini_model_1,
    )


def generate_js(html_content, css_content, project_description, prompt_version=None):
    formatted_prompt = registry.format(
        "web:js_generate",
        _version=prompt_version,
        html_content=html_content,
        css_content=css_content,
        project_description=project_description,
        time=utc_time_reference(),
    )
    system_instruction = registry.get("instruction:js_generate", version=prompt_version)
    return stream_gemini_content(
        contents=formatted_prompt,
        system_instruction=system_instruction,
        model=gemini_model_1,
    )


@app.route("/")
def index():
    logging.info("Serving index page.")
    return render_template("index.html")


@app.route("/generate_code", methods=["POST"])
@token_required
def generate_code():
    logging.info("Received request for /generate_code")

    try:
        token = request.headers.get("X-Recaptcha-Token")

        if not is_human(token):
            logging.warning("reCAPTCHA verification failed for /generate_code.")
            abort(403, description="reCAPTCHA verification failed.")

        data = request.get_json(silent=True) or {}
        problem_description = data.get("problem_description")
        language = data.get("language")
        prompt_version = request.headers.get("X-Prompt-Version") or data.get("prompt_version")

        if not problem_description or not language:
            return jsonify({"error": "Missing problem_description or language"}), 400

        if language not in valid_languages:
            logging.warning(f"Unsupported language requested for generation: {language}")
            return jsonify({"error": f"Unsupported language: {language}"}), 400

        logging.info(f"Generating code for language: {language} (prompt v{prompt_version or 'active'})")
        return get_generated_code(problem_description, language, prompt_version=prompt_version)

    except Exception as e:
        logging.error(f"Error in /generate_code endpoint: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/get-output", methods=["POST"])
@token_required
def get_output_api():
    logging.info("Received request for /get-output")

    try:
        token = request.headers.get("X-Recaptcha-Token")

        if not is_human(token):
            logging.warning("reCAPTCHA verification failed for /get-output.")
            abort(403, description="reCAPTCHA verification failed.")

        data = request.get_json(silent=True) or {}
        code = data.get("code")
        language = data.get("language")
        prompt_version = request.headers.get("X-Prompt-Version") or data.get("prompt_version")

        if not code or not language:
            logging.warning("Missing code or language in /get-output request.")
            return jsonify({"error": "Missing code or language"}), 400

        if language not in languages_prompts:
            logging.warning(f"Unsupported language for get_output: {language}")
            return jsonify({"error": f"Language '{language}' is not supported for execution"}), 400

        if len(code.encode("utf-8")) > MAX_SIZE:
            logging.warning("Code size exceeds maximum allowed limit.")
            return jsonify({"error": "Code size exceeds the 0.5 MB limit"}), 413
        
        code = f"\n\n{code}\n\n"

        logging.info(f"Getting output for language: {language} (prompt v{prompt_version or 'active'})")
        return get_output(code, language, prompt_version=prompt_version)

    except Exception as e:
        logging.error(f"Error in /get-output endpoint: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/refactor_code", methods=["POST"])
@token_required
def refactor_code_api():
    logging.info("Received request for /refactor_code")

    try:
        token = request.headers.get("X-Recaptcha-Token")

        if not is_human(token):
            logging.warning("reCAPTCHA verification failed for /refactor_code.")
            abort(403, description="reCAPTCHA verification failed.")

        data = request.get_json(silent=True) or {}
        code = data.get("code")
        language = data.get("language")
        problem_description = data.get("problem_description")
        output = data.get("output", "")
        prompt_version = request.headers.get("X-Prompt-Version") or data.get("prompt_version")

        if not code or not language:
            logging.warning("Missing code or language in /refactor_code request.")
            return jsonify({"error": "Missing code or language"}), 400

        if language not in valid_languages:
            return jsonify({"error": f"Unsupported language: {language}"}), 400

        if len(code.encode("utf-8")) > MAX_SIZE:
            logging.warning("Code size exceeds maximum allowed limit.")
            return jsonify({"error": "Code size exceeds the 0.5 MB limit"}), 413

        logging.info(f"Refactoring code for language: {language} (prompt v{prompt_version or 'active'})")
        return refactor_code(code, language, output, problem_description, prompt_version=prompt_version)

    except Exception as e:
        logging.error(f"Error in /refactor_code endpoint: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/improve-prompt", methods=["POST"])
@token_required
def improve_prompt():
    logging.info("Received request for /improve-prompt")
    token = request.headers.get("X-Recaptcha-Token")

    if not is_human(token):
        logging.warning("reCAPTCHA verification failed for /improve-prompt.")
        abort(403, description="reCAPTCHA verification failed.")

    data = request.get_json() or {}

    topic = data.get("topic")

    if not topic:
        return jsonify({"error": "Missing topic"}), 400

    language = data.get("language")

    if not language or language not in {"htmlcssjs"} | valid_languages:
        return jsonify({"error": "Invalid or missing language"}), 400

    try:
        client = genai.Client()

        prompt_version = request.headers.get("X-Prompt-Version") or data.get("prompt_version")
        prompt_template = registry.format(
            f"improve:{language}",
            _version=prompt_version,
            topic=topic,
        )
        system_instruction = registry.get("instruction:improve", version=prompt_version)

        response = client.models.generate_content(
            model=gemini_model,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
            ),
            contents=prompt_template,
        )

        gemini_output = response.text
        is_valid, parsed = validate_json(gemini_output)

        if not is_valid:
            logging.error("Invalid JSON response from Gemini for prompt improvement.")
            return jsonify({"error": "Invalid prompt format"}), 400

        logging.info(f"Successfully improved prompts for topic")

        return jsonify({"prompts": parsed})

    except Exception as e:
        logging.error(f"Error in /improve-prompt endpoint: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/htmlcssjsgenerate-code", methods=["POST"])
@token_required
def htmlcssjs_generate_stream():
    logging.info("Received request for /htmlcssjsgenerate-code")

    try:
        token = request.headers.get("X-Recaptcha-Token")
        if not is_human(token):
            logging.warning(
                "reCAPTCHA verification failed for /htmlcssjsgenerate-code."
            )
            abort(403, description="reCAPTCHA verification failed.")

        data = request.get_json() or {}
        code_type = data.get("type")
        prompt = data.get("prompt")
        html_content = data.get("htmlContent", "")
        css_content = data.get("cssContent", "")
        prompt_version = request.headers.get("X-Prompt-Version") or data.get("prompt_version")

        if not prompt:
            return jsonify({"error": "Project description is required"}), 400

        if code_type not in {"html", "css", "js"}:
            return jsonify({"error": "Invalid or missing 'type' parameter"}), 400

        logging.info(f"Generating {code_type} code (prompt v{prompt_version or 'active'})")

        generators = {
            "html": lambda: generate_html(prompt, prompt_version=prompt_version),
            "css": lambda: generate_css(html_content, prompt, prompt_version=prompt_version),
            "js": lambda: generate_js(html_content, css_content, prompt, prompt_version=prompt_version),
        }

        return generators[code_type]()

    except Exception as e:
        logging.error(f"Error in /htmlcssjsgenerate-code endpoint: {e}")
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint for Genai service."""
    # Check if Gemini API is configured
    gemini_configured = bool(os.getenv("GEMINI_API_KEY"))
    # Check if JWT secret is configured
    jwt_configured = bool(os.getenv("JWT_SECRET"))
    # Check if recaptcha is configured in production
    is_production = os.getenv("FLASK_ENV") == "production" or os.getenv("NODE_ENV") == "production"
    recaptcha_configured = bool(os.getenv("RECAPTCHA_SECRET_KEY")) if is_production else True

    # Lightweight Gemini API connectivity check (only if configured)
    gemini_healthy = False
    if gemini_configured:
        try:
            # Initialize client with timeout
            client = genai.Client()
            # Make a lightweight request to verify connectivity
            # We use a minimal request to check if the API is reachable
            # Note: This makes an actual API call but with minimal tokens
            models = list(client.models.list(page_size=1))
            gemini_healthy = len(list(models)) > 0
        except Exception as e:
            logging.warning(f"Gemini API health check failed: {str(e)}")
            gemini_healthy = False
    else:
        gemini_healthy = False

    is_healthy = gemini_healthy and jwt_configured and recaptcha_configured

    return jsonify({
        "status": "healthy" if is_healthy else "unhealthy",
        "service": "genai",
        "timestamp": utc_time_reference(),
        "checks": {
            "gemini_api_configured": gemini_configured,
            "gemini_api_healthy": gemini_healthy,
            "jwt_secret_configured": jwt_configured,
            "recaptcha_configured": recaptcha_configured if is_production else "skipped_in_dev",
            "prompt_templates_loaded": len(registry.list_prompts()),
        }
    }), 200 if is_healthy else 503

@app.route("/htmlcssjsrefactor-code", methods=["POST"])
@token_required
def htmlcssjs_refactor():
    logging.info("Received request for /htmlcssjsrefactor-code")
    try:
        token = request.headers.get("X-Recaptcha-Token")

        if not is_human(token):
            logging.warning(
                "reCAPTCHA verification failed for /htmlcssjsrefactor-code."
            )
            abort(403, description="reCAPTCHA verification failed.")

        data = request.get_json()

        html_content = data.get("html") if len(data.get("html", "")) > 0 else ""
        css_content = data.get("css") if len(data.get("css", "")) > 0 else ""
        js_content = data.get("js") if len(data.get("js", "")) > 0 else ""

        if len(html_content.encode("utf-8")) > MAX_SIZE:
            logging.warning("HTML content exceeds 0.5 MB limit.")
            return jsonify({"error": "HTML content exceeds the 0.5 MB limit."}), 413

        if len(css_content.encode("utf-8")) > MAX_SIZE:
            logging.warning("CSS content exceeds 0.5 MB limit.")
            return jsonify({"error": "CSS content exceeds the 0.5 MB limit."}), 413

        if len(js_content.encode("utf-8")) > MAX_SIZE:
            logging.warning("JS content exceeds 0.5 MB limit.")
            return jsonify({"error": "JS content exceeds the 0.5 MB limit."}), 413

        code_type = data.get("type")
        problem_description_raw = data.get("problem_description")

        problem_description = (
            problem_description_raw.strip().lower() if problem_description_raw else None
        )

        if not code_type:
            return jsonify({"error": "Type is required."}), 400

        logging.info(f"Refactoring htmlcssjs code for type: {code_type}")

        if code_type == "html" and html_content and problem_description:
            html_content_refactored = refactor_code_html_css_js(
                "html",
                refactor_html_prompt_user,
                {"html_content": html_content},
                problem_description,
            )

            html_content_refactored = re.search(
                CODE_REGEX, html_content_refactored, re.DOTALL
            )

            html_content_refactored = (
                html_content_refactored.group(1)
                if html_content_refactored
                else html_content
            )

            return jsonify({"html": html_content_refactored})

        elif code_type == "css" and html_content and problem_description:
            if not html_content:
                return (
                    jsonify({"error": "HTML content is required for CSS refactoring."}),
                    400,
                )

            css_content_refactored = refactor_code_html_css_js(
                "css",
                refactor_css_prompt_user,
                {"html_content": html_content, "css_content": css_content},
                problem_description,
            )

            css_content_refactored = re.search(
                CODE_REGEX, css_content_refactored, re.DOTALL
            )

            css_content_refactored = (
                css_content_refactored.group(1)
                if css_content_refactored
                else css_content
            )

            return jsonify({"css": css_content_refactored})

        elif code_type == "js" and html_content and css_content and problem_description:
            if not html_content or not css_content:
                return (
                    jsonify(
                        {
                            "error": "Both HTML and CSS content are required for JS refactoring."
                        }
                    ),
                    400,
                )

            js_content_refactored = refactor_code_html_css_js(
                "js",
                refactor_js_prompt_user,
                {
                    "html_content": html_content,
                    "css_content": css_content,
                    "js_content": js_content,
                },
                problem_description,
            )

            js_content_refactored = re.search(
                CODE_REGEX, js_content_refactored, re.DOTALL
            )

            js_content_refactored = (
                js_content_refactored.group(1) if js_content_refactored else js_content
            )

            return jsonify({"js": js_content_refactored})

        elif code_type == "html" and html_content:
            html_content_refactored = refactor_code_html_css_js(
                "html", refactor_html_prompt, {"html_content": html_content}
            )

            html_content_refactored = re.search(
                CODE_REGEX, html_content_refactored, re.DOTALL
            )

            html_content_refactored = (
                html_content_refactored.group(1)
                if html_content_refactored
                else html_content
            )

            return jsonify({"html": html_content_refactored})

        elif code_type == "css" and html_content:
            if not html_content:
                return (
                    jsonify({"error": "HTML content is required for CSS refactoring."}),
                    400,
                )

            css_content_refactored = refactor_code_html_css_js(
                "css",
                refactor_css_prompt,
                {"html_content": html_content, "css_content": css_content},
            )

            css_content_refactored = re.search(
                CODE_REGEX, css_content_refactored, re.DOTALL
            )

            css_content_refactored = (
                css_content_refactored.group(1)
                if css_content_refactored
                else css_content
            )

            return jsonify({"css": css_content_refactored})

        elif code_type == "js" and html_content and css_content:
            if not html_content or not css_content:
                return (
                    jsonify(
                        {
                            "error": "Both HTML and CSS content are required for JS refactoring."
                        }
                    ),
                    400,
                )

            js_content_refactored = refactor_code_html_css_js(
                "js",
                refactor_js_prompt,
                {
                    "html_content": html_content,
                    "css_content": css_content,
                    "js_content": js_content,
                },
            )

            js_content_refactored = re.search(
                CODE_REGEX, js_content_refactored, re.DOTALL
            )

            js_content_refactored = (
                js_content_refactored.group(1) if js_content_refactored else js_content
            )

            return jsonify({"js": js_content_refactored})

        else:
            return (
                jsonify(
                    {
                        "error": "Please provide the appropriate content for the requested type."
                    }
                ),
                400,
            )

    except Exception as e:
        logging.error(f"Error in /htmlcssjsrefactor-code endpoint: {e}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


# --- Prompt Versioning & Registry APIs ---

@app.route("/api/prompts", methods=["GET"])
def list_prompts_api():
    """List all registered prompt families, active versions, and metadata."""
    tag = request.args.get("tag")
    prompts_data = registry.list_prompts(tag=tag)
    return jsonify({
        "status": "success",
        "total": len(prompts_data),
        "prompts": prompts_data,
    }), 200


@app.route("/api/prompts/<path:prompt_name>", methods=["GET"])
def get_prompt_api(prompt_name):
    """Retrieve details and template text for a specific prompt version."""
    version = request.args.get("version")
    meta = registry.get_metadata(prompt_name, version=version)
    if not meta:
        return jsonify({"error": f"Prompt '{prompt_name}' not found"}), 404

    return jsonify({
        "name": meta.name,
        "version": meta.version,
        "active_version": registry.get_active_version(meta.name),
        "description": meta.description,
        "required_keys": meta.required_keys,
        "model_tier": meta.model_tier,
        "tags": meta.tags,
        "system_instruction": meta.system_instruction_name,
        "template": meta.template,
        "created_at": meta.created_at,
    }), 200


@app.route("/api/prompts/<path:prompt_name>/diff", methods=["GET"])
def diff_prompt_api(prompt_name):
    """Compute diff between two versions of a prompt template."""
    v1 = request.args.get("v1")
    v2 = request.args.get("v2")
    if not v1 or not v2:
        return jsonify({"error": "Query parameters 'v1' and 'v2' are required"}), 400

    try:
        diff_data = registry.diff_versions(prompt_name, v1, v2)
        return jsonify(diff_data), 200
    except KeyError as e:
        return jsonify({"error": str(e)}), 404


@app.route("/api/prompts/<path:prompt_name>/version", methods=["POST"])
@token_required
def set_prompt_active_version_api(prompt_name):
    """Set the active version for a prompt (authenticated)."""
    data = request.get_json(silent=True) or {}
    version = data.get("version")
    if not version:
        return jsonify({"error": "Missing 'version' parameter in request body"}), 400

    try:
        registry.set_active_version(prompt_name, version)
        return jsonify({
            "message": f"Active version for '{prompt_name}' updated to '{version}'.",
            "prompt_name": prompt_name,
            "active_version": version,
        }), 200
    except KeyError as e:
        return jsonify({"error": str(e)}), 400


if __name__ == "__main__":
    app.run(debug=False, port=5001)
