#!/usr/bin/env python3
"""CLI Evaluation Runner for Code-Buddi GenAI Prompts.

Executes standardized evaluation benchmark against the PromptRegistry
and outputs summary tables, category scores, and reports.

Usage:
    python evaluate_prompts.py [--live] [--category CATEGORY] [--version VERSION]
                               [--export-json PATH] [--export-md PATH] [--verbose]
"""

import argparse
import logging
import os
import sys
from pathlib import Path

# Set up paths
genai_dir = Path(__file__).resolve().parent
if str(genai_dir) not in sys.path:
    sys.path.insert(0, str(genai_dir))

from evals.evaluator import PromptEvaluator
from prompt_registry import registry


def format_table(headers, rows):
    """Simple terminal table formatter without external dependencies."""
    col_widths = [len(h) for h in headers]
    for row in rows:
        for i, val in enumerate(row):
            col_widths[i] = max(col_widths[i], len(str(val)))

    header_str = " | ".join(h.ljust(col_widths[i]) for i, h in enumerate(headers))
    sep_str = "-+-".join("-" * col_widths[i] for i in range(len(headers)))
    row_strs = [
        " | ".join(str(val).ljust(col_widths[i]) for i, val in enumerate(row))
        for row in rows
    ]
    return f"{header_str}\n{sep_str}\n" + "\n".join(row_strs)


def main():
    parser = argparse.ArgumentParser(
        description="Run evaluation benchmark suite on Code-Buddi prompt templates."
    )
    parser.add_argument(
        "--live",
        action="store_true",
        help="Execute live Gemini API calls (requires GEMINI_API_KEY environment variable).",
    )
    parser.add_argument(
        "--category",
        "-c",
        type=str,
        help="Filter evaluation to a specific category (e.g., syntax_errors, clean_execution, prompt_improvement).",
    )
    parser.add_argument(
        "--version",
        "-v",
        type=str,
        default=None,
        help="Evaluate a specific prompt version (defaults to active version).",
    )
    parser.add_argument(
        "--export-json",
        type=str,
        default=None,
        help="Export evaluation results to a JSON file.",
    )
    parser.add_argument(
        "--export-md",
        type=str,
        default=None,
        help="Export evaluation results to a Markdown report.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print detailed logs for each test case.",
    )

    args = parser.parse_args()

    # Configure logging
    log_level = logging.DEBUG if args.verbose else logging.WARNING
    logging.basicConfig(level=log_level, format="%(levelname)s: %(message)s")

    print("=" * 72)
    print(" 🚀 Code-Buddi Prompt Evaluation Harness (prompts.py - 1270 lines)")
    print(f" Target Mode: {'🟢 LIVE GEMINI API' if args.live else '⚪ OFFLINE DETERMINISTIC'}")
    if args.category:
        print(f" Category Filter: {args.category}")
    if args.version:
        print(f" Target Version: {args.version}")
    print("=" * 72)

    evaluator = PromptEvaluator()
    categories = [args.category] if args.category else None

    report = evaluator.run_suite(
        categories=categories,
        version=args.version,
        live=args.live,
    )

    print("\n--- Category Breakdown ---")
    cat_headers = ["Category", "Total", "Passed", "Failed", "Errors", "Pass Rate"]
    cat_rows = []
    for cat, stats in sorted(report.category_metrics.items()):
        total = stats["total"]
        passed = stats["passed"]
        failed = stats["failed"]
        errors = stats["errors"]
        rate = (passed / total * 100) if total > 0 else 0.0
        cat_rows.append([cat, total, passed, failed, errors, f"{rate:.1f}%"])

    print(format_table(cat_headers, cat_rows))

    print("\n--- Summary ---")
    print(f"Total Cases:     {report.total_cases}")
    print(f"Passed:          {report.passed_cases} ✅")
    print(f"Failed:          {report.failed_cases} ❌")
    print(f"Errors:          {report.error_cases} ⚠️")
    print(f"Pass Rate:       {report.pass_rate * 100:.2f}%")
    print(f"Total Duration:  {report.total_duration_ms:.2f} ms")

    if args.verbose or report.failed_cases > 0 or report.error_cases > 0:
        print("\n--- Detailed Case Results ---")
        for res in report.results:
            status_icon = "✅" if res.passed else "❌"
            print(f"[{status_icon} {res.status}] {res.case_id} ({res.prompt_name} v{res.version}) - {res.duration_ms:.1f}ms")
            if res.errors:
                for err in res.errors:
                    print(f"    ⚠️  {err}")

    # Exports
    if args.export_json:
        export_path = Path(args.export_json)
        export_path.parent.mkdir(parents=True, exist_ok=True)
        with open(export_path, "w", encoding="utf-8") as f:
            import json
            json.dump(report.to_dict(), f, indent=2)
        print(f"\n📁 Evaluation JSON exported to: {export_path}")

    if args.export_md:
        export_path = Path(args.export_md)
        export_path.parent.mkdir(parents=True, exist_ok=True)
        with open(export_path, "w", encoding="utf-8") as f:
            f.write(report.to_markdown())
        print(f"📁 Evaluation Markdown exported to: {export_path}")

    print("=" * 72)

    # Exit code
    if report.failed_cases > 0 or report.error_cases > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
