"""Prompt Versioning and Registry System for Code-Buddi GenAI service.

Provides semantic versioning, schema validation, metadata management,
backward-compatible access, and evaluation support for all LLM prompt templates
originating from prompts.py (1270 lines).
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
import difflib
import logging
import re
import string
from typing import Dict, List, Optional, Any, Set, Mapping

logger = logging.getLogger(__name__)


@dataclass
class PromptMetadata:
    """Metadata describing a single version of a prompt template."""
    name: str
    version: str
    template: str
    required_keys: List[str] = field(default_factory=list)
    description: str = ""
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    is_active: bool = True
    model_tier: str = "flash"  # e.g., 'flash' (gemini-2.5-flash) or 'pro' (gemini-2.5-pro)
    tags: List[str] = field(default_factory=list)
    system_instruction_name: Optional[str] = None


class DictCompatibilityProxy(Mapping[str, str]):
    """Read-only dictionary proxy mapping language keys to active prompt templates.
    
    Preserves 100% backward compatibility for legacy dictionary lookups like:
    languages_prompts[language] and improve_prompts[language].
    """

    def __init__(self, registry: "PromptRegistry", prefix: str):
        self._registry = registry
        self._prefix = prefix

    def __getitem__(self, key: str) -> str:
        prompt_name = f"{self._prefix}:{key}"
        return self._registry.get(prompt_name)

    def __iter__(self):
        prefix_len = len(self._prefix) + 1
        for name in self._registry.list_prompt_names():
            if name.startswith(f"{self._prefix}:"):
                yield name[prefix_len:]

    def __len__(self):
        return sum(1 for _ in self)

    def __contains__(self, key: object) -> bool:
        if not isinstance(key, str):
            return False
        prompt_name = f"{self._prefix}:{key}"
        return self._registry.has_prompt(prompt_name)

    def get(self, key: str, default: Any = None) -> Any:
        try:
            return self[key]
        except KeyError:
            return default


class PromptRegistry:
    """Registry maintaining semantic versioned prompt templates with schema validation."""

    def __init__(self):
        # Structure: {canonical_name: {version_string: PromptMetadata}}
        self._prompts: Dict[str, Dict[str, PromptMetadata]] = {}
        # Structure: {canonical_name: active_version_string}
        self._active_versions: Dict[str, str] = {}
        # Structure: {alias_name: canonical_name}
        self._aliases: Dict[str, str] = {}
        # Structure: {canonical_name: default_system_instruction_name}
        self._system_instructions: Dict[str, str] = {}

    @staticmethod
    def extract_placeholders(template: str) -> Set[str]:
        """Extract all placeholder names enclosed in single curly braces."""
        formatter = string.Formatter()
        placeholders = set()
        try:
            for _, field_name, _, _ in formatter.parse(template):
                if field_name:
                    root_field = field_name.split("[")[0].split(".")[0]
                    placeholders.add(root_field)
        except Exception as e:
            logger.warning(f"Error parsing template placeholders: {e}")
        return placeholders

    def _resolve_name(self, name: str) -> str:
        """Resolve aliases to the canonical prompt name."""
        return self._aliases.get(name, name)

    def has_prompt(self, name: str) -> bool:
        """Check if prompt or alias exists."""
        canonical = self._resolve_name(name)
        return canonical in self._prompts

    def list_prompt_names(self) -> List[str]:
        """Return list of all canonical prompt names."""
        return sorted(list(self._prompts.keys()))

    def register(
        self,
        name: str,
        version: str,
        template: str,
        required_keys: Optional[List[str]] = None,
        description: str = "",
        is_active: bool = True,
        model_tier: str = "flash",
        tags: Optional[List[str]] = None,
        system_instruction_name: Optional[str] = None,
    ) -> PromptMetadata:
        """Register a new version of a prompt template."""
        if not name or not version or template is None:
            raise ValueError("Prompt name, version, and template are required.")

        parsed_keys = self.extract_placeholders(template)
        keys = required_keys if required_keys is not None else sorted(list(parsed_keys))

        metadata = PromptMetadata(
            name=name,
            version=version,
            template=template,
            required_keys=keys,
            description=description,
            is_active=is_active,
            model_tier=model_tier,
            tags=tags or [],
            system_instruction_name=system_instruction_name,
        )

        if name not in self._prompts:
            self._prompts[name] = {}

        self._prompts[name][version] = metadata

        if is_active or name not in self._active_versions:
            self._active_versions[name] = version

        return metadata

    def add_alias(self, alias_name: str, canonical_name: str) -> None:
        """Register an alias pointing to a canonical prompt name."""
        self._aliases[alias_name] = canonical_name

    def get_metadata(
        self, name: str, version: Optional[str] = None, fallback_to_active: bool = True
    ) -> Optional[PromptMetadata]:
        """Retrieve metadata for a prompt version (defaults to active/latest)."""
        canonical = self._resolve_name(name)
        if canonical not in self._prompts:
            return None

        target_version = version or self._active_versions.get(canonical)
        if target_version == "latest":
            target_version = self.get_latest_version(canonical)

        metadata = self._prompts[canonical].get(target_version)
        if not metadata and fallback_to_active:
            active_version = self._active_versions.get(canonical)
            if active_version:
                logger.warning(
                    f"Prompt '{canonical}' version '{version}' not found; falling back to active '{active_version}'."
                )
                metadata = self._prompts[canonical].get(active_version)

        return metadata

    def get(
        self, name: str, version: Optional[str] = None, fallback_to_active: bool = True
    ) -> str:
        """Retrieve prompt template text for specified or active version."""
        metadata = self.get_metadata(name, version, fallback_to_active=fallback_to_active)
        if not metadata:
            raise KeyError(
                f"Prompt '{name}' (version '{version or 'active'}') not found."
            )
        return metadata.template

    def get_latest_version(self, name: str) -> Optional[str]:
        """Get the latest registered version string for a prompt name."""
        canonical = self._resolve_name(name)
        if canonical not in self._prompts:
            return None
        versions = list(self._prompts[canonical].keys())
        return versions[-1] if versions else None

    def get_active_version(self, name: str) -> Optional[str]:
        """Get the current active version string for a prompt name."""
        canonical = self._resolve_name(name)
        return self._active_versions.get(canonical)

    def set_active_version(self, name: str, version: str) -> None:
        """Set the active version for a given prompt name."""
        canonical = self._resolve_name(name)
        if canonical not in self._prompts or version not in self._prompts[canonical]:
            raise KeyError(f"Prompt '{canonical}' version '{version}' does not exist.")
        self._active_versions[canonical] = version
        for v, meta in self._prompts[canonical].items():
            meta.is_active = (v == version)

    def list_prompts(self, tag: Optional[str] = None) -> Dict[str, Any]:
        """List registered prompts, active versions, and version history."""
        result = {}
        for canonical, version_dict in self._prompts.items():
            active_v = self._active_versions.get(canonical)
            active_meta = version_dict.get(active_v)
            if tag and active_meta and tag not in active_meta.tags:
                continue

            result[canonical] = {
                "active_version": active_v,
                "versions": list(version_dict.keys()),
                "description": active_meta.description if active_meta else "",
                "required_keys": active_meta.required_keys if active_meta else [],
                "model_tier": active_meta.model_tier if active_meta else "flash",
                "tags": active_meta.tags if active_meta else [],
                "system_instruction": active_meta.system_instruction_name if active_meta else None,
            }
        return result

    def format(
        self,
        _prompt_name: str,
        _version: Optional[str] = None,
        _fallback_to_active: bool = True,
        **kwargs,
    ) -> str:
        """Format a prompt with parameters, strictly validating required placeholders."""
        metadata = self.get_metadata(_prompt_name, _version, fallback_to_active=_fallback_to_active)
        if not metadata:
            raise KeyError(
                f"Prompt '{_prompt_name}' (version '{_version or 'active'}') not found."
            )

        missing = [key for key in metadata.required_keys if key not in kwargs]
        if missing:
            raise ValueError(
                f"Missing required parameters for prompt '{metadata.name}' v{metadata.version}: {missing}"
            )

        try:
            return metadata.template.format(**kwargs)
        except Exception as e:
            raise ValueError(
                f"Formatting failed for prompt '{metadata.name}' v{metadata.version}: {e}"
            )

    def diff_versions(self, name: str, v1: str, v2: str) -> Dict[str, Any]:
        """Produce a visual diff and schema difference between two prompt versions."""
        canonical = self._resolve_name(name)
        meta1 = self.get_metadata(canonical, v1, fallback_to_active=False)
        meta2 = self.get_metadata(canonical, v2, fallback_to_active=False)

        if not meta1:
            raise KeyError(f"Prompt '{canonical}' version '{v1}' not found.")
        if not meta2:
            raise KeyError(f"Prompt '{canonical}' version '{v2}' not found.")

        t1_lines = meta1.template.splitlines(keepends=True)
        t2_lines = meta2.template.splitlines(keepends=True)

        diff = list(
            difflib.unified_diff(
                t1_lines,
                t2_lines,
                fromfile=f"{canonical} v{v1}",
                tofile=f"{canonical} v{v2}",
            )
        )

        keys1 = set(meta1.required_keys)
        keys2 = set(meta2.required_keys)

        return {
            "name": canonical,
            "v1": v1,
            "v2": v2,
            "diff": "".join(diff),
            "added_keys": sorted(list(keys2 - keys1)),
            "removed_keys": sorted(list(keys1 - keys2)),
            "model_tier_v1": meta1.model_tier,
            "model_tier_v2": meta2.model_tier,
        }

    # Backward-compatible convenience properties
    @property
    def languages_prompts(self) -> DictCompatibilityProxy:
        return DictCompatibilityProxy(self, "compiler")

    @property
    def improve_prompts(self) -> DictCompatibilityProxy:
        return DictCompatibilityProxy(self, "improve")

    def get_compiler_prompt(self, language: str, version: Optional[str] = None) -> str:
        return self.get(f"compiler:{language}", version)

    def get_improve_prompt(self, language: str, version: Optional[str] = None) -> str:
        return self.get(f"improve:{language}", version)

    def get_system_instruction(self, instruction_name: str, version: Optional[str] = None) -> str:
        return self.get(f"instruction:{instruction_name}", version)


def load_defaults_from_prompts(reg: PromptRegistry) -> None:
    """Populate registry with baseline v1.0.0 prompts from prompts.py (1270 lines)."""
    try:
        import prompts
    except ImportError:
        logger.error("Could not import prompts.py module to populate registry.")
        return

    # 1. Register Compiler System Instruction & Language Execution Prompts
    reg.register(
        name="instruction:compiler",
        version="1.0.0",
        template=prompts.compiler_instruction,
        description="System instruction establishing deterministic compiler persona",
        tags=["instruction", "compiler", "system"],
        model_tier="pro",
    )
    reg.add_alias("compiler_instruction", "instruction:compiler")

    for lang, template in prompts.languages_prompts.items():
        canonical_name = f"compiler:{lang}"
        reg.register(
            name=canonical_name,
            version="1.0.0",
            template=template,
            description=f"Deterministic simulated execution prompt for {lang.capitalize()}",
            tags=["compiler", "execution", lang],
            model_tier="pro",
            system_instruction_name="instruction:compiler",
        )
        reg.add_alias(f"languages_prompts.{lang}", canonical_name)

    # Register an experimental v1.1.0 version for python compiler demonstrating versioning
    python_v1_1_0 = prompts.languages_prompts["python"].replace(
        '- Runtime errors: Provide a clear description (e.g., "Division by zero", "Index out of bounds").',
        '- Runtime errors: Provide a clear description (e.g., "Division by zero", "Index out of bounds"). Distinguish between uncaught exceptions and graceful error logs.'
    )
    reg.register(
        name="compiler:python",
        version="1.1.0-canary",
        template=python_v1_1_0,
        description="Python compiler prompt v1.1.0 with enhanced runtime error categorization",
        is_active=False,  # Kept inactive for canary / opt-in testing
        tags=["compiler", "execution", "python", "canary"],
        model_tier="pro",
        system_instruction_name="instruction:compiler",
    )

    # 2. Register Improve System Instruction & Language Improvement Prompts
    reg.register(
        name="instruction:improve",
        version="1.0.0",
        template=prompts.system_improve_prompt,
        description="System instruction for generating structured JSON prompt variations",
        tags=["instruction", "improve", "system"],
        model_tier="pro",
    )
    reg.add_alias("system_improve_prompt", "instruction:improve")

    for lang, template in prompts.improve_prompts.items():
        canonical_name = f"improve:{lang}"
        reg.register(
            name=canonical_name,
            version="1.0.0",
            template=template,
            description=f"Prompt optimization and variation generator for {lang}",
            tags=["improve", "optimization", lang],
            model_tier="pro",
            system_instruction_name="instruction:improve",
        )
        reg.add_alias(f"improve_prompts.{lang}", canonical_name)

    # 3. Register Refactor & Generate Instructions
    reg.register(
        name="instruction:refactor",
        version="1.0.0",
        template=prompts.refactor_instruction,
        description="System instruction establishing deterministic code refactoring engine persona",
        tags=["instruction", "refactor", "system"],
        model_tier="pro",
    )
    reg.add_alias("refactor_instruction", "instruction:refactor")

    reg.register(
        name="instruction:generate",
        version="1.0.0",
        template=prompts.generate_instruction,
        description="System instruction establishing deterministic code generator persona",
        tags=["instruction", "generate", "system"],
        model_tier="pro",
    )
    reg.add_alias("generate_instruction", "instruction:generate")

    # 4. Register Web Generation System Instructions
    reg.register(
        name="instruction:html_generate",
        version="1.0.0",
        template=prompts.html_generate_instruction,
        description="System instruction for deterministic HTML generation",
        tags=["instruction", "html", "web", "system"],
        model_tier="flash",
    )
    reg.add_alias("html_generate_instruction", "instruction:html_generate")

    reg.register(
        name="instruction:css_generate",
        version="1.0.0",
        template=prompts.css_generate_instruction,
        description="System instruction for deterministic CSS generation",
        tags=["instruction", "css", "web", "system"],
        model_tier="flash",
    )
    reg.add_alias("css_generate_instruction", "instruction:css_generate")

    reg.register(
        name="instruction:js_generate",
        version="1.0.0",
        template=prompts.js_generate_instruction,
        description="System instruction for deterministic JavaScript generation",
        tags=["instruction", "js", "web", "system"],
        model_tier="flash",
    )
    reg.add_alias("js_generate_instruction", "instruction:js_generate")

    # 5. Register Code Generation & Refactoring Prompts
    reg.register(
        name="code:generate",
        version="1.0.0",
        template=prompts.generate_code_prompt,
        description="Single-language runnable code generation prompt",
        tags=["code", "generate"],
        model_tier="pro",
        system_instruction_name="instruction:generate",
    )
    reg.add_alias("generate_code_prompt", "code:generate")

    reg.register(
        name="code:refactor",
        version="1.0.0",
        template=prompts.refactor_code_prompt,
        description="Single-language code refactoring prompt based on execution output",
        tags=["code", "refactor"],
        model_tier="pro",
        system_instruction_name="instruction:refactor",
    )
    reg.add_alias("refactor_code_prompt", "code:refactor")

    reg.register(
        name="code:refactor_user",
        version="1.0.0",
        template=prompts.refactor_code_prompt_user,
        description="Single-language code refactoring prompt guided by user problem description",
        tags=["code", "refactor", "user"],
        model_tier="pro",
        system_instruction_name="instruction:refactor",
    )
    reg.add_alias("refactor_code_prompt_user", "code:refactor_user")

    # 6. Register Web Trio Generation Prompts
    reg.register(
        name="web:html_generate",
        version="1.0.0",
        template=prompts.html_prompt,
        description="Structural HTML generation prompt with responsive & accessible guidelines",
        tags=["web", "html", "generate"],
        model_tier="flash",
        system_instruction_name="instruction:html_generate",
    )
    reg.add_alias("html_prompt", "web:html_generate")

    reg.register(
        name="web:css_generate",
        version="1.0.0",
        template=prompts.css_prompt,
        description="Responsive CSS styling prompt based on existing HTML structure",
        tags=["web", "css", "generate"],
        model_tier="flash",
        system_instruction_name="instruction:css_generate",
    )
    reg.add_alias("css_prompt", "web:css_generate")

    reg.register(
        name="web:js_generate",
        version="1.0.0",
        template=prompts.js_prompt,
        description="Interactive vanilla JavaScript generation prompt connecting HTML and CSS",
        tags=["web", "js", "generate"],
        model_tier="flash",
        system_instruction_name="instruction:js_generate",
    )
    reg.add_alias("js_prompt", "web:js_generate")

    # 7. Register Web Trio Refactoring Prompts
    reg.register(
        name="web:html_refactor",
        version="1.0.0",
        template=prompts.refactor_html_prompt,
        description="Automated HTML cleanup and accessibility refactoring prompt",
        tags=["web", "html", "refactor"],
        model_tier="flash",
        system_instruction_name="instruction:refactor",
    )
    reg.add_alias("refactor_html_prompt", "web:html_refactor")

    reg.register(
        name="web:css_refactor",
        version="1.0.0",
        template=prompts.refactor_css_prompt,
        description="Automated CSS optimization and responsive design refactoring prompt",
        tags=["web", "css", "refactor"],
        model_tier="flash",
        system_instruction_name="instruction:refactor",
    )
    reg.add_alias("refactor_css_prompt", "web:css_refactor")

    reg.register(
        name="web:js_refactor",
        version="1.0.0",
        template=prompts.refactor_js_prompt,
        description="Automated JavaScript code cleanup and modularity refactoring prompt",
        tags=["web", "js", "refactor"],
        model_tier="flash",
        system_instruction_name="instruction:refactor",
    )
    reg.add_alias("refactor_js_prompt", "web:js_refactor")

    reg.register(
        name="web:html_refactor_user",
        version="1.0.0",
        template=prompts.refactor_html_prompt_user,
        description="User-directed HTML refactoring prompt",
        tags=["web", "html", "refactor", "user"],
        model_tier="flash",
        system_instruction_name="instruction:refactor",
    )
    reg.add_alias("refactor_html_prompt_user", "web:html_refactor_user")

    reg.register(
        name="web:css_refactor_user",
        version="1.0.0",
        template=prompts.refactor_css_prompt_user,
        description="User-directed CSS refactoring prompt",
        tags=["web", "css", "refactor", "user"],
        model_tier="flash",
        system_instruction_name="instruction:refactor",
    )
    reg.add_alias("refactor_css_prompt_user", "web:css_refactor_user")

    reg.register(
        name="web:js_refactor_user",
        version="1.0.0",
        template=prompts.refactor_js_prompt_user,
        description="User-directed JavaScript refactoring prompt",
        tags=["web", "js", "refactor", "user"],
        model_tier="flash",
        system_instruction_name="instruction:refactor",
    )
    reg.add_alias("refactor_js_prompt_user", "web:js_refactor_user")


# Global registry singleton initialized with defaults from prompts.py
registry = PromptRegistry()
load_defaults_from_prompts(registry)
