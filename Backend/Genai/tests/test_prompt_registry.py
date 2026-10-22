"""Unit tests for PromptRegistry and prompt versioning system."""

import unittest
from pathlib import Path
import sys

# Ensure Genai directory is in sys.path
genai_dir = Path(__file__).resolve().parent.parent
if str(genai_dir) not in sys.path:
    sys.path.insert(0, str(genai_dir))

from prompt_registry import registry, PromptRegistry, PromptMetadata
import prompts


class TestPromptRegistry(unittest.TestCase):
    """Test suite for PromptRegistry core capabilities."""

    def setUp(self):
        self.reg = registry

    def test_all_default_prompts_registered(self):
        """Assert all 58 prompt families from prompts.py are registered."""
        catalog = self.reg.list_prompts()
        self.assertGreaterEqual(len(catalog), 58)

        # 19 compiler prompts
        for lang in prompts.languages_prompts.keys():
            self.assertIn(f"compiler:{lang}", catalog)

        # 20 improve prompts
        for lang in prompts.improve_prompts.keys():
            self.assertIn(f"improve:{lang}", catalog)

        # Instructions
        expected_instructions = [
            "instruction:compiler",
            "instruction:improve",
            "instruction:refactor",
            "instruction:generate",
            "instruction:html_generate",
            "instruction:css_generate",
            "instruction:js_generate",
        ]
        for inst in expected_instructions:
            self.assertIn(inst, catalog)

        # Web & Code prompts
        expected_web = [
            "web:html_generate",
            "web:css_generate",
            "web:js_generate",
            "web:html_refactor",
            "web:css_refactor",
            "web:js_refactor",
            "web:html_refactor_user",
            "web:css_refactor_user",
            "web:js_refactor_user",
            "code:generate",
            "code:refactor",
            "code:refactor_user",
        ]
        for item in expected_web:
            self.assertIn(item, catalog)

    def test_alias_resolution(self):
        """Assert aliases resolve transparently to canonical prompt names."""
        self.assertEqual(
            self.reg.get_metadata("generate_code_prompt").name, "code:generate"
        )
        self.assertEqual(
            self.reg.get_metadata("compiler_instruction").name, "instruction:compiler"
        )
        self.assertEqual(
            self.reg.get_metadata("languages_prompts.python").name, "compiler:python"
        )
        self.assertEqual(
            self.reg.get_metadata("improve_prompts.htmlcssjs").name, "improve:htmlcssjs"
        )

    def test_dict_compatibility_proxy(self):
        """Assert backward compatibility for dictionary-style lookups."""
        self.assertIn("python", self.reg.languages_prompts)
        self.assertIn("javascript", self.reg.languages_prompts)
        self.assertIn("htmlcssjs", self.reg.improve_prompts)
        self.assertIn("python", self.reg.improve_prompts)

        # Compare content with prompts.py
        self.assertEqual(
            self.reg.languages_prompts["python"], prompts.languages_prompts["python"]
        )
        self.assertEqual(
            self.reg.improve_prompts["htmlcssjs"], prompts.improve_prompts["htmlcssjs"]
        )

    def test_format_validation(self):
        """Assert formatting strictly validates parameters."""
        # Valid format
        result = self.reg.format(
            "code:generate",
            problem_description="Sort an array",
            language="python",
        )
        self.assertIn("Sort an array", result)
        self.assertIn("python", result)

        # Missing required parameter raises ValueError
        with self.assertRaises(ValueError) as ctx:
            self.reg.format("code:generate", problem_description="Sort an array")
        self.assertIn("language", str(ctx.exception))

    def test_version_isolation_and_diff(self):
        """Assert independent version registration and diff computation."""
        meta_v1 = self.reg.get_metadata("compiler:python", "1.0.0")
        meta_v1_1 = self.reg.get_metadata("compiler:python", "1.1.0-canary")

        self.assertIsNotNone(meta_v1)
        self.assertIsNotNone(meta_v1_1)
        self.assertEqual(meta_v1.version, "1.0.0")
        self.assertEqual(meta_v1_1.version, "1.1.0-canary")

        # Diff
        diff_res = self.reg.diff_versions("compiler:python", "1.0.0", "1.1.0-canary")
        self.assertEqual(diff_res["name"], "compiler:python")
        self.assertIn("Distinguish between uncaught exceptions", diff_res["diff"])

    def test_active_version_switching(self):
        """Assert changing active version works cleanly."""
        custom_reg = PromptRegistry()
        custom_reg.register("test:sample", "1.0.0", "Hello {name}", is_active=True)
        custom_reg.register("test:sample", "2.0.0", "Greetings {name}", is_active=False)

        self.assertEqual(custom_reg.get_active_version("test:sample"), "1.0.0")
        self.assertEqual(custom_reg.format("test:sample", name="Alice"), "Hello Alice")

        # Switch active version
        custom_reg.set_active_version("test:sample", "2.0.0")
        self.assertEqual(custom_reg.get_active_version("test:sample"), "2.0.0")
        self.assertEqual(custom_reg.format("test:sample", name="Alice"), "Greetings Alice")

    def test_unknown_prompt_raises(self):
        """Assert lookup of unregistered prompt raises KeyError."""
        with self.assertRaises(KeyError):
            self.reg.get("non_existent_prompt")


if __name__ == "__main__":
    unittest.main()
