"""
Language configuration and runtime normalization for Code-Buddi's 19 supported languages.
Maps frontend language identifiers to sandboxed execution configurations.
"""

from dataclasses import dataclass
from typing import Dict, Optional, Set, List


@dataclass
class LanguageSpec:
    canonical_id: str
    piston_language: str
    default_filename: str
    extension: str
    aliases: List[str]
    is_compiled: bool = False
    requires_custom_harness: bool = False


# Supported languages in Code-Buddi
LANGUAGE_REGISTRY: Dict[str, LanguageSpec] = {
    "python": LanguageSpec(
        canonical_id="python",
        piston_language="python",
        default_filename="main.py",
        extension=".py",
        aliases=["py", "python3"],
        is_compiled=False,
    ),
    "javascript": LanguageSpec(
        canonical_id="javascript",
        piston_language="javascript",
        default_filename="index.js",
        extension=".js",
        aliases=["js", "node"],
        is_compiled=False,
    ),
    "typescript": LanguageSpec(
        canonical_id="typescript",
        piston_language="typescript",
        default_filename="index.ts",
        extension=".ts",
        aliases=["ts"],
        is_compiled=True,
    ),
    "c": LanguageSpec(
        canonical_id="c",
        piston_language="c",
        default_filename="main.c",
        extension=".c",
        aliases=["gcc", "clang"],
        is_compiled=True,
    ),
    "cpp": LanguageSpec(
        canonical_id="cpp",
        piston_language="c++",
        default_filename="main.cpp",
        extension=".cpp",
        aliases=["c++", "cplusplus", "g++"],
        is_compiled=True,
    ),
    "java": LanguageSpec(
        canonical_id="java",
        piston_language="java",
        default_filename="Main.java",
        extension=".java",
        aliases=["javac", "openjdk"],
        is_compiled=True,
    ),
    "csharp": LanguageSpec(
        canonical_id="csharp",
        piston_language="csharp",
        default_filename="Program.cs",
        extension=".cs",
        aliases=["c#", "cs", "dotnet"],
        is_compiled=True,
    ),
    "rust": LanguageSpec(
        canonical_id="rust",
        piston_language="rust",
        default_filename="main.rs",
        extension=".rs",
        aliases=["rs", "rustc"],
        is_compiled=True,
    ),
    "go": LanguageSpec(
        canonical_id="go",
        piston_language="go",
        default_filename="main.go",
        extension=".go",
        aliases=["golang"],
        is_compiled=False, # handled by go run
    ),
    "kotlin": LanguageSpec(
        canonical_id="kotlin",
        piston_language="kotlin",
        default_filename="Main.kt",
        extension=".kt",
        aliases=["kt", "kotlinc"],
        is_compiled=True,
    ),
    "swift": LanguageSpec(
        canonical_id="swift",
        piston_language="swift",
        default_filename="main.swift",
        extension=".swift",
        aliases=[],
        is_compiled=True,
    ),
    "ruby": LanguageSpec(
        canonical_id="ruby",
        piston_language="ruby",
        default_filename="main.rb",
        extension=".rb",
        aliases=["rb"],
        is_compiled=False,
    ),
    "dart": LanguageSpec(
        canonical_id="dart",
        piston_language="dart",
        default_filename="main.dart",
        extension=".dart",
        aliases=[],
        is_compiled=False,
    ),
    "perl": LanguageSpec(
        canonical_id="perl",
        piston_language="perl",
        default_filename="main.pl",
        extension=".pl",
        aliases=["pl"],
        is_compiled=False,
    ),
    "scala": LanguageSpec(
        canonical_id="scala",
        piston_language="scala",
        default_filename="Main.scala",
        extension=".scala",
        aliases=[],
        is_compiled=True,
    ),
    "julia": LanguageSpec(
        canonical_id="julia",
        piston_language="julia",
        default_filename="main.jl",
        extension=".jl",
        aliases=["jl"],
        is_compiled=False,
    ),
    "verilog": LanguageSpec(
        canonical_id="verilog",
        piston_language="iverilog",
        default_filename="tb.v",
        extension=".v",
        aliases=["v", "icarus"],
        is_compiled=True,
        requires_custom_harness=True,
    ),
    "sql": LanguageSpec(
        canonical_id="sql",
        piston_language="sqlite3",
        default_filename="query.sql",
        extension=".sql",
        aliases=["sqlite", "sqlite3"],
        is_compiled=False,
        requires_custom_harness=True,
    ),
    "mongodb": LanguageSpec(
        canonical_id="mongodb",
        piston_language="javascript", # Executed via mongosh simulation or isolated node script
        default_filename="query.js",
        extension=".js",
        aliases=["mongo"],
        is_compiled=False,
        requires_custom_harness=True,
    ),
}

# Fast lookup map including aliases
ALIAS_MAP: Dict[str, str] = {}
for spec in LANGUAGE_REGISTRY.values():
    ALIAS_MAP[spec.canonical_id.lower()] = spec.canonical_id
    for alias in spec.aliases:
        ALIAS_MAP[alias.lower()] = spec.canonical_id


def resolve_language(lang_input: str) -> Optional[LanguageSpec]:
    """Resolve an incoming user-specified language or alias to its LanguageSpec."""
    if not lang_input:
        return None
    normalized = lang_input.strip().lower()
    canonical = ALIAS_MAP.get(normalized)
    if canonical:
        return LANGUAGE_REGISTRY.get(canonical)
    return None


def get_supported_languages() -> Set[str]:
    """Return set of all supported canonical language identifiers."""
    return set(LANGUAGE_REGISTRY.keys())
