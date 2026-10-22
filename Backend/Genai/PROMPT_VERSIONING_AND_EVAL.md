# Prompt Versioning & Evaluation Benchmark Guide

## 1. Overview & Architecture

The **Code-Buddi GenAI Service** utilizes 58 prompt templates and system instructions spanning ~1,270 lines in `Backend/Genai/prompts.py`. These prompts govern code generation, simulated compiler execution, code refactoring, web development (HTML/CSS/JS), and prompt optimization across 19 programming languages.

To transition from static prompt constants to an enterprise-grade LLM pipeline, Phase 6 introduces:
1. **Semantic Prompt Registry (`prompt_registry.py`)**: Centralized versioning, template registration, schema/placeholder validation, runtime active version switching, and 100% backward-compatible proxy lookups.
2. **REST Management Endpoints (`Backend/Genai/app.py`)**: Inspection, version diffing, and dynamic prompt selection via HTTP headers (`X-Prompt-Version`) and query parameters.
3. **Evaluation Benchmark Suite (`Backend/Genai/evals/`)**: Standardized 31-case evaluation dataset across 9 categories verifying instruction adherence, constraint enforcement, and execution simulation without markdown leakage.
4. **CLI & Automated Test Harness (`evaluate_prompts.py` & `Backend/Genai/tests/`)**: Automated evaluation runner producing markdown/JSON reports with pass rate metrics and CI-ready unittest assertions.

```
+-------------------------------------------------------------------------------+
|                               Code-Buddi GenAI                                |
+-------------------------------------------------------------------------------+
        |                                                   |
        v                                                   v
+-------------------------------+               +-------------------------------+
|  Backend/Genai/prompts.py     |               |   HTTP / API Clients          |
|  (1270 lines of base templates|               |   (X-Prompt-Version header)   |
+-------------------------------+               +-------------------------------+
        |                                                   |
        +-------------------+           +-------------------+
                            |           |
                            v           v
            +-----------------------------------------------+
            |    PromptRegistry (prompt_registry.py)        |
            | - Semantic version catalog (v1.0.0, canary)   |
            | - Schema validation & placeholder parsing     |
            | - Backward-compatible proxy dictionaries      |
            | - Active version switching & diffing          |
            +-----------------------------------------------+
                                    |
                    +---------------+---------------+
                    |                               |
                    v                               v
    +-------------------------------+   +-------------------------------+
    |  Backend/Genai/app.py         |   |  PromptEvaluator              |
    |  - /api/prompts               |   |  - dataset.json (31 cases)    |
    |  - /api/prompts/<name>        |   |  - Template AST validation    |
    |  - /api/prompts/<name>/diff   |   |  - Instruction rubrics        |
    |  - Versioned model streaming  |   |  - evaluate_prompts.py CLI    |
    +-------------------------------+   +-------------------------------+
```

---

## 2. Prompt Registry Features

### 2.1 Canonical Naming & Categorization
The registry organizes the 58 prompts into namespaced canonical keys:

| Namespace | Example Names | Required Keys | Target Model |
| :--- | :--- | :--- | :--- |
| `compiler:{lang}` | `compiler:python`, `compiler:javascript` | `["code", "time"]` | `gemini-2.5-pro` |
| `improve:{lang}` | `improve:python`, `improve:htmlcssjs` | `["topic"]` | `gemini-2.5-pro` |
| `instruction:{type}` | `instruction:compiler`, `instruction:refactor` | `["language"]` or none | `gemini-2.5-pro` |
| `code:{action}` | `code:generate`, `code:refactor` | `["problem_description", "language"]` | `gemini-2.5-pro` |
| `web:{action}` | `web:html_generate`, `web:css_generate` | `["prompt", "time"]`, etc. | `gemini-2.5-flash` |

### 2.2 Backward Compatibility
The registry provides mapping proxies that behave as standard dictionaries:
```python
from prompt_registry import registry

# Legacy dictionary lookups continue to work seamlessly:
python_prompt = registry.languages_prompts["python"]
improve_prompt = registry.improve_prompts["htmlcssjs"]

# Direct aliases resolve to canonical names:
meta = registry.get_metadata("generate_code_prompt")
assert meta.name == "code:generate"
```

### 2.3 Semantic Versioning & Diffing
Register new versions, diff templates, and select active versions:
```python
from prompt_registry import registry

# Register a canary or experimental prompt version
registry.register(
    name="compiler:python",
    version="1.1.0-canary",
    template="... enhanced template ...",
    is_active=False
)

# Visual unified diff between two prompt versions
diff = registry.diff_versions("compiler:python", "1.0.0", "1.1.0-canary")
print(diff["diff"])

# Switch active version in-flight
registry.set_active_version("compiler:python", "1.1.0-canary")
```

---

## 3. REST API Reference

### 3.1 List Prompts
`GET /api/prompts`
- **Query Params**: `tag` (optional filter, e.g. `?tag=compiler`)
- **Response**:
```json
{
  "status": "success",
  "total": 58,
  "prompts": {
    "compiler:python": {
      "active_version": "1.0.0",
      "versions": ["1.0.0", "1.1.0-canary"],
      "description": "Deterministic simulated execution prompt for Python",
      "required_keys": ["code", "time"],
      "model_tier": "pro",
      "tags": ["compiler", "execution", "python"]
    }
  }
}
```

### 3.2 Get Prompt Details
`GET /api/prompts/<path:prompt_name>`
- **Query Params**: `version` (optional, defaults to active)
- **Response**:
```json
{
  "name": "compiler:python",
  "version": "1.0.0",
  "active_version": "1.0.0",
  "description": "Deterministic simulated execution prompt for Python",
  "required_keys": ["code", "time"],
  "model_tier": "pro",
  "template": "Analyze the following Python code:\n..."
}
```

### 3.3 Diff Two Versions
`GET /api/prompts/<path:prompt_name>/diff?v1=1.0.0&v2=1.1.0-canary`
- **Response**:
```json
{
  "name": "compiler:python",
  "v1": "1.0.0",
  "v2": "1.1.0-canary",
  "added_keys": [],
  "removed_keys": [],
  "diff": "--- compiler:python v1.0.0\n+++ compiler:python v1.1.0-canary\n..."
}
```

### 3.4 Per-Request Version Pinning
Clients can request specific prompt versions by supplying the header:
```http
X-Prompt-Version: 1.1.0-canary
```
or by passing `"prompt_version": "1.1.0-canary"` in the JSON request body.

---

## 4. Evaluation Benchmark Suite

### 4.1 Evaluation Dataset Categories (`dataset.json`)
The evaluation benchmark covers 31 curated test cases across 9 critical categories:

1. **`syntax_errors` (6 cases)**: Verifies exact syntax error detection across Python, JavaScript, C, Java, Go, Rust without markdown wrapping.
2. **`runtime_errors` (4 cases)**: Division by zero, IndexError, JavaScript TypeError on null, C null pointer dereference.
3. **`clean_execution` (4 cases)**: Plaintext stdout generation for arithmetic, loops, string reversal.
4. **`infinite_loops` (2 cases)**: Enforces prompt rule capping infinite loops at the first 20 iterations followed by `...`.
5. **`comments_only` (2 cases)**: Verifies that commented snippets are not executed.
6. **`prompt_improvement` (4 cases)**: Enforces schema compliance returning JSON with keys `prompt_1`, `prompt_2`, etc.
7. **`web_generation` (3 cases)**: Validates absence of inline scripts, absence of `<html>`/`<head>`/`<body>`, and inclusion of responsive media queries.
8. **`refactoring` (3 cases)**: Tests automated error fixes and user-guided refactoring.
9. **`adversarial_security` (3 cases)**: Tests resistance against prompt injection overrides, nested fence collisions, and non-supported language fallbacks.

### 4.2 Running Evaluations

#### CLI Runner
```bash
# Run full offline evaluation suite
python Backend/Genai/evaluate_prompts.py

# Verbose output with detailed case inspection
python Backend/Genai/evaluate_prompts.py --verbose

# Filter by category
python Backend/Genai/evaluate_prompts.py --category syntax_errors

# Export report in JSON and Markdown
python Backend/Genai/evaluate_prompts.py --export-json Backend/Genai/evals/eval_report.json --export-md Backend/Genai/evals/eval_report.md

# Live inference against Gemini API (requires GEMINI_API_KEY)
python Backend/Genai/evaluate_prompts.py --live
```

#### Automated Unit Tests
```bash
python3 -m unittest discover Backend/Genai/tests
```
All 11 automated test cases run in ~0.003 seconds and verify template integrity, placeholder extraction, proxy dictionary access, version diffing, and 100% benchmark compliance.
