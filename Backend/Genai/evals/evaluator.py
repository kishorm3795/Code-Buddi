"""Evaluation Engine and Rubric Verifier for Code-Buddi GenAI Prompts.

Provides offline deterministic checks (template syntax, placeholder validation,
instruction constraint verification) and optional live LLM evaluation against
Gemini models.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
import re
import sys
import time
from typing import Dict, List, Optional, Any, Set, Tuple

# Add parent directory to path so prompt_registry and utils are importable
current_dir = Path(__file__).resolve().parent
parent_dir = current_dir.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

from prompt_registry import registry, PromptRegistry, PromptMetadata
import utils

logger = logging.getLogger(__name__)


@dataclass
class TestCaseResult:
    """Detailed evaluation result for a single test case."""
    case_id: str
    category: str
    prompt_name: str
    version: str
    passed: bool
    status: str  # 'PASSED', 'FAILED', 'SKIPPED', 'ERROR'
    duration_ms: float
    message: str = ""
    errors: List[str] = field(default_factory=list)
    rendered_prompt_length: int = 0
    model_output: Optional[str] = None


@dataclass
class EvaluationReport:
    """Comprehensive benchmark execution report."""
    total_cases: int
    passed_cases: int
    failed_cases: int
    error_cases: int
    skipped_cases: int
    pass_rate: float
    total_duration_ms: float
    category_metrics: Dict[str, Dict[str, Any]]
    results: List[TestCaseResult]
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    is_live: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "is_live": self.is_live,
            "summary": {
                "total": self.total_cases,
                "passed": self.passed_cases,
                "failed": self.failed_cases,
                "errors": self.error_cases,
                "skipped": self.skipped_cases,
                "pass_rate_pct": round(self.pass_rate * 100, 2),
                "total_duration_ms": round(self.total_duration_ms, 2),
            },
            "category_metrics": self.category_metrics,
            "results": [
                {
                    "case_id": r.case_id,
                    "category": r.category,
                    "prompt_name": r.prompt_name,
                    "version": r.version,
                    "passed": r.passed,
                    "status": r.status,
                    "duration_ms": round(r.duration_ms, 2),
                    "message": r.message,
                    "errors": r.errors,
                    "rendered_prompt_length": r.rendered_prompt_length,
                }
                for r in self.results
            ],
        }

    def to_markdown(self) -> str:
        lines = [
            "# Code-Buddi Prompt Evaluation Benchmark Report",
            "",
            f"- **Execution Timestamp**: `{self.timestamp}`",
            f"- **Mode**: {'🟢 Live Gemini Inference' if self.is_live else '⚪ Offline Deterministic Verification'}",
            f"- **Total Test Cases**: `{self.total_cases}`",
            f"- **Passed**: `{self.passed_cases}`",
            f"- **Failed**: `{self.failed_cases}`",
            f"- **Pass Rate**: `{round(self.pass_rate * 100, 2)}%`",
            f"- **Duration**: `{round(self.total_duration_ms, 2)} ms`",
            "",
            "## Category Breakdown",
            "",
            "| Category | Total | Passed | Failed | Pass Rate |",
            "| :--- | :--- | :--- | :--- | :--- |",
        ]
        for cat, stats in sorted(self.category_metrics.items()):
            rate = stats["passed"] / stats["total"] if stats["total"] > 0 else 0
            lines.append(
                f"| `{cat}` | {stats['total']} | {stats['passed']} | {stats['failed']} | {round(rate * 100, 1)}% |"
            )

        lines.extend([
            "",
            "## Detailed Results",
            "",
            "| Case ID | Category | Target Prompt | Status | Details |",
            "| :--- | :--- | :--- | :--- | :--- |",
        ])
        for r in self.results:
            status_badge = "✅ PASS" if r.passed else "❌ FAIL"
            details = r.message if not r.errors else f"{r.message} ({'; '.join(r.errors)})"
            lines.append(
                f"| `{r.case_id}` | `{r.category}` | `{r.prompt_name}` | {status_badge} | {details} |"
            )

        return "\n".join(lines)


class PromptEvaluator:
    """Evaluation harness executing rubric checks and tests against prompt registry."""

    def __init__(self, dataset_path: Optional[str] = None):
        self.dataset_path = dataset_path or str(current_dir / "dataset.json")
        self.dataset = self._load_dataset()

    def _load_dataset(self) -> Dict[str, Any]:
        with open(self.dataset_path, "r", encoding="utf-8") as f:
            return json.load(f)

    # 1. Structural Checks on Prompt Templates
    @staticmethod
    def validate_template_syntax(
        prompt_name: str, version: Optional[str] = None
    ) -> Tuple[bool, List[str]]:
        """Validate template string parsing and placeholder consistency."""
        errors = []
        meta = registry.get_metadata(prompt_name, version)
        if not meta:
            return False, [f"Prompt '{prompt_name}' v'{version or 'active'}' not found."]

        # Check placeholder extraction
        try:
            detected_keys = registry.extract_placeholders(meta.template)
            for req in meta.required_keys:
                if req not in detected_keys:
                    errors.append(
                        f"Declared required key '{req}' not present in template placeholders: {detected_keys}"
                    )
        except Exception as e:
            errors.append(f"Template placeholder parsing error: {e}")

        # Check dummy formatting
        dummy_params = {k: f"__TEST_{k.upper()}__" for k in meta.required_keys}
        try:
            formatted = meta.template.format(**dummy_params)
            for val in dummy_params.values():
                if val not in formatted:
                    errors.append(f"Dummy parameter value '{val}' missing from formatted output.")
        except Exception as e:
            errors.append(f"Template dummy formatting failed: {e}")

        # Negative test: missing parameter should raise ValueError
        if meta.required_keys:
            try:
                registry.format(prompt_name, version=version)
                errors.append("Registry failed to reject missing required parameters.")
            except ValueError:
                pass  # Expected rejection
            except Exception as e:
                errors.append(f"Unexpected exception on missing parameter check: {e}")

        return (len(errors) == 0), errors

    # 2. Instruction Rubric and Constraint Checks
    @staticmethod
    def check_instruction_constraints(
        prompt_name: str, version: Optional[str] = None
    ) -> Tuple[bool, List[str]]:
        """Verify standard instruction guidelines for prompt families."""
        errors = []
        meta = registry.get_metadata(prompt_name, version)
        if not meta:
            return False, [f"Prompt '{prompt_name}' not found."]

        t = meta.template

        # Rules for compiler simulation prompts
        if "compiler" in meta.tags and not prompt_name.startswith("instruction:"):
            if "plain text format" not in t.lower() and "do not use markdown" not in t.lower():
                errors.append("Compiler prompt must prohibit markdown output.")
            # Iterative languages require infinite loop 20-iteration instruction
            is_query_lang = any(ql in meta.tags for ql in ("sql", "mongodb"))
            if not is_query_lang:
                if "20 iterations" not in t.lower() or "..." not in t:
                    errors.append("Compiler prompt must contain 20-iteration infinite loop cap with '...'.")
            else:
                if "show a sample output" not in t.lower():
                    errors.append("Query compiler prompt must specify sample output instruction.")
            if "comment" not in t.lower():
                errors.append("Compiler prompt must contain non-execution rule for commented snippets.")
            if "language not supported" not in t.lower():
                errors.append("Compiler prompt must specify 'Language not supported' fallback.")

        # Rules for improve prompts
        if "improve" in meta.tags and not prompt_name.startswith("instruction:"):
            if "json format" not in t.lower():
                errors.append("Improve prompt must require JSON format.")
            if "prompt_1" not in t or "prompt_2" not in t:
                errors.append("Improve prompt must specify prompt_1, prompt_2 key format.")

        # Rules for web HTML prompt
        if prompt_name == "web:html_generate":
            if not re.search(r"exclude all.*html.*head.*body", t, re.IGNORECASE):
                errors.append("HTML generation prompt must forbid html, head, body tags.")
            if "do not include any inline javascript" not in t.lower():
                errors.append("HTML generation prompt must forbid inline JavaScript.")

        # Rules for web CSS prompt
        if prompt_name == "web:css_generate":
            if "@apply" not in t.lower():
                errors.append("CSS generation prompt must forbid @apply.")
            if "media queries" not in t.lower() and "responsive" not in t.lower():
                errors.append("CSS generation prompt must mandate responsive styling.")

        # Rules for web JS prompt
        if prompt_name == "web:js_generate":
            if "addeventlistener" not in t.lower():
                errors.append("JS generation prompt must mandate addEventListener.")
            if "return only the javascript code" not in t.lower():
                errors.append("JS prompt must mandate pure JS output.")

        return (len(errors) == 0), errors

    # 3. Offline Case Evaluation
    def evaluate_offline_case(
        self, case: Dict[str, Any], version: Optional[str] = None
    ) -> TestCaseResult:
        """Evaluate a test case deterministically without invoking live LLM API."""
        start_time = time.perf_counter()
        case_id = case["id"]
        category = case["category"]
        prompt_name = case["prompt_name"]
        inputs = dict(case.get("inputs", {}))
        expected = case.get("expected", {})

        errors = []

        # Populate runtime reference placeholder if required
        meta = registry.get_metadata(prompt_name, version)
        if not meta:
            duration_ms = (time.perf_counter() - start_time) * 1000
            return TestCaseResult(
                case_id=case_id,
                category=category,
                prompt_name=prompt_name,
                version=version or "active",
                passed=False,
                status="ERROR",
                duration_ms=duration_ms,
                message=f"Prompt '{prompt_name}' not registered in PromptRegistry.",
                errors=[f"Unregistered prompt: {prompt_name}"],
            )

        if "time" in meta.required_keys and "time" not in inputs:
            inputs["time"] = utils.utc_time_reference()

        # Step 1: Format prompt using registry
        try:
            rendered = registry.format(prompt_name, version=version, **inputs)
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            return TestCaseResult(
                case_id=case_id,
                category=category,
                prompt_name=prompt_name,
                version=meta.version,
                passed=False,
                status="FAILED",
                duration_ms=duration_ms,
                message=f"Registry format failed: {e}",
                errors=[str(e)],
            )

        # Step 2: Validate template constraints
        const_ok, const_errs = self.check_instruction_constraints(prompt_name, version)
        if not const_ok:
            errors.extend(const_errs)

        # Step 3: Verify inputs are injected cleanly into the rendered prompt
        for k, val in inputs.items():
            if isinstance(val, str) and len(val) > 10:
                # Check sample substring from input exists in rendered prompt
                sample = val.strip().split("\n")[0][:25]
                if sample not in rendered:
                    errors.append(f"Input parameter '{k}' was not properly interpolated into prompt.")

        # Step 4: Validate expected rubrics structure
        if expected.get("forbid_markdown") and "do not use markdown" not in meta.template.lower():
            errors.append("Expected rubric forbids markdown, but prompt lacks markdown prohibition.")

        if expected.get("must_be_valid_json") and "json" not in meta.template.lower():
            errors.append("Expected rubric demands valid JSON, but prompt lacks JSON instructions.")

        duration_ms = (time.perf_counter() - start_time) * 1000
        passed = (len(errors) == 0)

        return TestCaseResult(
            case_id=case_id,
            category=category,
            prompt_name=prompt_name,
            version=meta.version,
            passed=passed,
            status="PASSED" if passed else "FAILED",
            duration_ms=duration_ms,
            message="Offline deterministic evaluation verified template integrity and rubrics." if passed else "Evaluation failed rubrics.",
            errors=errors,
            rendered_prompt_length=len(rendered),
        )

    # 4. Live Case Evaluation against Gemini API
    def evaluate_live_case(
        self, case: Dict[str, Any], client: Any, version: Optional[str] = None
    ) -> TestCaseResult:
        """Evaluate a test case with live Gemini inference."""
        start_time = time.perf_counter()
        case_id = case["id"]
        category = case["category"]
        prompt_name = case["prompt_name"]
        inputs = dict(case.get("inputs", {}))
        expected = case.get("expected", {})

        meta = registry.get_metadata(prompt_name, version)
        if not meta:
            duration_ms = (time.perf_counter() - start_time) * 1000
            return TestCaseResult(
                case_id=case_id,
                category=category,
                prompt_name=prompt_name,
                version=version or "active",
                passed=False,
                status="ERROR",
                duration_ms=duration_ms,
                message=f"Prompt '{prompt_name}' not found.",
                errors=[f"Unregistered prompt: {prompt_name}"],
            )

        if "time" in meta.required_keys and "time" not in inputs:
            inputs["time"] = utils.utc_time_reference()

        try:
            rendered = registry.format(prompt_name, version=version, **inputs)
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            return TestCaseResult(
                case_id=case_id,
                category=category,
                prompt_name=prompt_name,
                version=meta.version,
                passed=False,
                status="FAILED",
                duration_ms=duration_ms,
                message=f"Prompt format error: {e}",
                errors=[str(e)],
            )

        # Retrieve system instruction if linked
        sys_instruction = ""
        if meta.system_instruction_name:
            sys_instruction = registry.get(meta.system_instruction_name)
            if "{language}" in sys_instruction and "language" in inputs:
                sys_instruction = sys_instruction.format(language=inputs["language"])

        # Execute model call
        target_model = os.getenv("GEMINI_MODEL") or "gemini-2.5-pro" if meta.model_tier == "pro" else os.getenv("GEMINI_MODEL_1") or "gemini-2.5-flash"

        try:
            from google.genai import types
            config_kwargs = {}
            if sys_instruction:
                config_kwargs["system_instruction"] = sys_instruction

            response = client.models.generate_content(
                model=target_model,
                contents=rendered,
                config=types.GenerateContentConfig(**config_kwargs) if config_kwargs else None,
            )
            output = response.text or ""
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            return TestCaseResult(
                case_id=case_id,
                category=category,
                prompt_name=prompt_name,
                version=meta.version,
                passed=False,
                status="ERROR",
                duration_ms=duration_ms,
                message=f"Gemini API inference failed: {e}",
                errors=[str(e)],
            )

        # Rubric checks against model output
        errors = []

        # Check markdown prohibition
        if expected.get("forbid_markdown"):
            if "```" in output:
                errors.append("Model output contains markdown code fences (```) despite prohibition.")

        # Check expected substrings
        for sub in expected.get("expected_substrings", []):
            if sub.lower() not in output.lower():
                errors.append(f"Expected substring '{sub}' missing from model output.")

        # Check forbidden substrings
        for sub in expected.get("forbid_substrings", []):
            if sub.lower() in output.lower():
                errors.append(f"Forbidden substring '{sub}' found in model output.")

        # Check JSON validity for prompt improvement
        if expected.get("must_be_valid_json"):
            is_valid, parsed = utils.validate_json(output)
            if not is_valid:
                errors.append(f"Model output is not valid JSON meeting prompt schema: {output[:100]}...")
            elif expected.get("min_variations") and len(parsed) < expected["min_variations"]:
                errors.append(f"Returned only {len(parsed)} variations; expected at least {expected['min_variations']}.")

        duration_ms = (time.perf_counter() - start_time) * 1000
        passed = (len(errors) == 0)

        return TestCaseResult(
            case_id=case_id,
            category=category,
            prompt_name=prompt_name,
            version=meta.version,
            passed=passed,
            status="PASSED" if passed else "FAILED",
            duration_ms=duration_ms,
            message="Live inference satisfied all rubrics." if passed else "Rubric assertion failure.",
            errors=errors,
            rendered_prompt_length=len(rendered),
            model_output=output,
        )

    # 5. Suite Runner
    def run_suite(
        self,
        categories: Optional[List[str]] = None,
        version: Optional[str] = None,
        live: bool = False,
    ) -> EvaluationReport:
        """Run all matching test cases and synthesize an EvaluationReport."""
        cases = self.dataset.get("cases", [])
        if categories:
            cases = [c for c in cases if c.get("category") in categories]

        client = None
        if live:
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                logger.warning("GEMINI_API_KEY not set. Falling back to offline evaluation.")
                live = False
            else:
                from google import genai
                client = genai.Client()

        results: List[TestCaseResult] = []
        category_metrics: Dict[str, Dict[str, Any]] = {}

        total_start = time.perf_counter()

        for case in cases:
            cat = case.get("category", "default")
            if cat not in category_metrics:
                category_metrics[cat] = {"total": 0, "passed": 0, "failed": 0, "errors": 0}
            category_metrics[cat]["total"] += 1

            if live:
                res = self.evaluate_live_case(case, client, version=version)
            else:
                res = self.evaluate_offline_case(case, version=version)

            results.append(res)
            if res.status == "PASSED":
                category_metrics[cat]["passed"] += 1
            elif res.status == "FAILED":
                category_metrics[cat]["failed"] += 1
            else:
                category_metrics[cat]["errors"] += 1

        total_duration_ms = (time.perf_counter() - total_start) * 1000

        passed_count = sum(1 for r in results if r.passed)
        failed_count = sum(1 for r in results if r.status == "FAILED")
        error_count = sum(1 for r in results if r.status == "ERROR")
        skipped_count = sum(1 for r in results if r.status == "SKIPPED")
        total_count = len(results)
        pass_rate = passed_count / total_count if total_count > 0 else 0.0

        return EvaluationReport(
            total_cases=total_count,
            passed_cases=passed_count,
            failed_cases=failed_count,
            error_cases=error_count,
            skipped_cases=skipped_count,
            pass_rate=pass_rate,
            total_duration_ms=total_duration_ms,
            category_metrics=category_metrics,
            results=results,
            is_live=live,
        )
