"""Unit and integration tests for prompt evaluation benchmark suite."""

import unittest
from pathlib import Path
import sys

# Ensure Genai directory is in sys.path
genai_dir = Path(__file__).resolve().parent.parent
if str(genai_dir) not in sys.path:
    sys.path.insert(0, str(genai_dir))

from evals.evaluator import PromptEvaluator
from prompt_registry import registry


class TestPromptsEvaluation(unittest.TestCase):
    """Test suite executing the prompt benchmark harness."""

    @classmethod
    def setUpClass(cls):
        cls.evaluator = PromptEvaluator()

    def test_benchmark_dataset_structure(self):
        """Validate structure and minimum requirements of evaluation dataset."""
        data = self.evaluator.dataset
        self.assertIn("categories", data)
        self.assertIn("cases", data)
        self.assertGreaterEqual(len(data["cases"]), 25)

        for case in data["cases"]:
            self.assertIn("id", case)
            self.assertIn("category", case)
            self.assertIn("prompt_name", case)
            self.assertIn("inputs", case)
            self.assertIn("expected", case)

    def test_template_syntax_across_all_registered_prompts(self):
        """Verify that every single registered prompt template has valid Python format syntax."""
        prompts = registry.list_prompts()
        for name in prompts.keys():
            valid, errors = self.evaluator.validate_template_syntax(name)
            self.assertTrue(
                valid, f"Prompt '{name}' failed template syntax validation: {errors}"
            )

    def test_instruction_constraints_across_all_prompts(self):
        """Verify standard instruction guidelines across all registered prompts."""
        prompts = registry.list_prompts()
        for name in prompts.keys():
            valid, errors = self.evaluator.check_instruction_constraints(name)
            self.assertTrue(
                valid, f"Prompt '{name}' violated instruction constraints: {errors}"
            )

    def test_full_offline_evaluation_suite(self):
        """Run full evaluation suite in offline mode and assert 100% pass rate."""
        report = self.evaluator.run_suite(live=False)

        self.assertEqual(
            report.failed_cases,
            0,
            f"Failed test cases: {[r.case_id for r in report.results if not r.passed]}",
        )
        self.assertEqual(report.error_cases, 0)
        self.assertEqual(report.pass_rate, 1.0)
        self.assertGreater(report.total_cases, 20)


if __name__ == "__main__":
    unittest.main()
