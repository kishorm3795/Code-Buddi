/**
 * Lazy loaders for language sample code snippets.
 * Using dynamic import(?raw) splits code samples into separate chunks
 * rather than bundling them into the initial main bundle.
 */

const sampleLoaders = {
  python: () => import("../samples/python.py?raw"),
  javascript: () => import("../samples/javascript.js?raw"),
  c: () => import("../samples/c.c?raw"),
  cpp: () => import("../samples/cpp.cpp?raw"),
  java: () => import("../samples/java.java?raw"),
  csharp: () => import("../samples/csharp.cs?raw"),
  rust: () => import("../samples/rust.rs?raw"),
  go: () => import("../samples/go.go?raw"),
  verilog: () => import("../samples/verilog.v?raw"),
  sql: () => import("../samples/sql.sql?raw"),
  mongodb: () => import("../samples/mongodb.js?raw"),
  swift: () => import("../samples/swift.swift?raw"),
  ruby: () => import("../samples/ruby.rb?raw"),
  typescript: () => import("../samples/typescript.ts?raw"),
  dart: () => import("../samples/dart.dart?raw"),
  kotlin: () => import("../samples/kotlin.kt?raw"),
  perl: () => import("../samples/perl.pl?raw"),
  scala: () => import("../samples/scala.scala?raw"),
  julia: () => import("../samples/julia.jl?raw"),
  bash: () => import("../samples/bash.sh?raw"),
};

export const loadSampleCode = async (language) => {
  const loader = sampleLoaders[language];
  if (!loader) return "";
  try {
    const mod = await loader();
    return mod.default || "";
  } catch (err) {
    console.warn(`Could not load sample for ${language}:`, err);
    return "";
  }
};

export const loadHtmlCssJsSamples = async () => {
  try {
    const [htmlMod, cssMod, jsMod] = await Promise.all([
      import("../samples/index.html?raw"),
      import("../samples/style.css?raw"),
      import("../samples/script.js?raw"),
    ]);
    return {
      html: htmlMod.default || "",
      css: cssMod.default || "",
      javascript: jsMod.default || "",
    };
  } catch (err) {
    console.warn("Could not load htmlcssjs samples:", err);
    return { html: "", css: "", javascript: "" };
  }
};
