import React, { useState, useEffect } from "react";
import { FaTimes, FaFolderOpen, FaFileCode, FaCheck } from "react-icons/fa";

const templates = [
  {
    id: "blank",
    name: "Blank",
    description: "Start with a single empty file",
    icon: "📄",
    languages: ["javascript", "python", "typescript", "html", "css", "go", "rust", "java", "csharp", "cpp", "c"],
    defaultLanguage: "javascript",
  },
  {
    id: "react",
    name: "React + Vite",
    description: "Modern React app with Vite, JSX, and hot reload",
    icon: "⚛️",
    languages: ["javascript", "typescript"],
    defaultLanguage: "javascript",
  },
  {
    id: "python",
    name: "Python",
    description: "Python project with main.py and requirements.txt",
    icon: "🐍",
    languages: ["python"],
    defaultLanguage: "python",
  },
  {
    id: "node",
    name: "Node.js",
    description: "Node.js project with package.json and ES modules",
    icon: "🟢",
    languages: ["javascript", "typescript"],
    defaultLanguage: "javascript",
  },
  {
    id: "go",
    name: "Go",
    description: "Go module with main.go and go.mod",
    icon: "🐹",
    languages: ["go"],
    defaultLanguage: "go",
  },
  {
    id: "rust",
    name: "Rust",
    description: "Rust project with Cargo.toml and src/main.rs",
    icon: "🦀",
    languages: ["rust"],
    defaultLanguage: "rust",
  },
];

const languages = [
  { id: "javascript", name: "JavaScript", ext: "js" },
  { id: "typescript", name: "TypeScript", ext: "ts" },
  { id: "python", name: "Python", ext: "py" },
  { id: "html", name: "HTML", ext: "html" },
  { id: "css", name: "CSS", ext: "css" },
  { id: "go", name: "Go", ext: "go" },
  { id: "rust", name: "Rust", ext: "rs" },
  { id: "java", name: "Java", ext: "java" },
  { id: "csharp", name: "C#", ext: "cs" },
  { id: "cpp", name: "C++", ext: "cpp" },
  { id: "c", name: "C", ext: "c" },
  { id: "ruby", name: "Ruby", ext: "rb" },
  { id: "php", name: "PHP", ext: "php" },
  { id: "swift", name: "Swift", ext: "swift" },
  { id: "kotlin", name: "Kotlin", ext: "kt" },
  { id: "dart", name: "Dart", ext: "dart" },
  { id: "scala", name: "Scala", ext: "scala" },
  { id: "julia", name: "Julia", ext: "jl" },
];

const NewProjectModal = ({ onClose, onCreate }) => {
  const [step, setStep] = useState(1); // 1: template, 2: details
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    // Focus name input on step 2
    if (step === 2) {
      setTimeout(() => document.getElementById('project-name')?.focus(), 100);
    }
  }, [step]);

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setSelectedLanguage(template.defaultLanguage);
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setSelectedTemplate(null);
  };

  const handleCreate = () => {
    if (!projectName.trim()) {
      setNameError("Project name is required");
      return;
    }
    if (!/^[a-zA-Z0-9-_ ]+$/.test(projectName.trim())) {
      setNameError("Name can only contain letters, numbers, spaces, hyphens, and underscores");
      return;
    }
    setNameError("");
    onCreate(projectName.trim(), selectedTemplate.id, selectedLanguage);
  };

  const availableLanguages = selectedTemplate
    ? languages.filter(l => selectedTemplate.languages.includes(l.id))
    : languages;

  if (step === 1) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-900 rounded-xl hacker-glass hacker-border p-0 max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Project</h2>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>

          {/* Template Grid */}
          <div className="p-4 overflow-y-auto max-h-[70vh]">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Choose a template to start with</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className={`
                    p-4 rounded-xl border-2 transition-all duration-200 text-left
                    ${selectedTemplate?.id === template.id
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-200 dark:border-gray-700 hover:border-green-500/50'
                    }
                    hacker-card-advanced
                  `}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{template.icon}</span>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white">{template.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{template.description}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {template.languages.map((lang) => {
                      const l = languages.find(x => x.id === lang);
                      return l && (
                        <span key={lang} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded">
                          {l.name}
                        </span>
                      );
                    })}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Project Details
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-xl hacker-glass hacker-border p-0 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={handleBack}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configure Project</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Template Info */}
          <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <span className="text-2xl">{selectedTemplate?.icon}</span>
            <div>
              <div className="font-bold text-gray-900 dark:text-white">{selectedTemplate?.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{selectedTemplate?.description}</div>
            </div>
          </div>

          {/* Project Name */}
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Project Name
            </label>
            <input
              id="project-name"
              type="text"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                if (nameError) setNameError("");
              }}
              placeholder="my-awesome-project"
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 ${
                nameError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {nameError && (
              <p className="mt-1 text-sm text-red-500">{nameError}</p>
            )}
          </div>

          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Primary Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {availableLanguages.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name} ({lang.ext})
                </option>
              ))}
            </select>
            {availableLanguages.length === 1 && (
              <p className="mt-1 text-xs text-gray-500">This template only supports {availableLanguages[0].name}</p>
            )}
          </div>

          {/* Preview */}
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Project Structure Preview</div>
            <ProjectStructurePreview template={selectedTemplate} name={projectName || "my-project"} language={selectedLanguage} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleBack}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
            >
              <FaCheck className="w-4 h-4" />
              Create Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProjectStructurePreview = ({ template, name, language }) => {
  const getFiles = (templateId, projectName, lang) => {
    const files = {
      blank: [`${getDefaultEntryFile(lang)}`],
      react: [
        "package.json",
        "index.html",
        "src/main.jsx",
        "src/App.jsx",
        "src/App.css",
        ".gitignore",
      ],
      python: ["main.py", "requirements.txt", "README.md", ".gitignore"],
      node: ["package.json", "index.js", ".gitignore"],
      go: ["go.mod", "main.go", "README.md"],
      rust: ["Cargo.toml", "src/main.rs", ".gitignore"],
    };
    return files[templateId] || files.blank;
  };

  const getDefaultEntryFile = (lang) => {
    const map = {
      javascript: "index.js",
      typescript: "index.ts",
      python: "main.py",
      html: "index.html",
      css: "style.css",
      go: "main.go",
      rust: "main.rs",
      java: "Main.java",
      csharp: "Program.cs",
      cpp: "main.cpp",
      c: "main.c",
    };
    return map[lang] || "main.txt";
  };

  const files = getFiles(template?.id, name, language);

  return (
    <div className="font-mono text-sm text-gray-700 dark:text-gray-300 space-y-1">
      <div className="flex items-center gap-1">
        <FaFolderOpen className="w-4 h-4 text-yellow-400" />
        <span>{name}/</span>
      </div>
      {files.map((file, i) => (
        <div key={file} className="pl-6 flex items-center gap-1">
          {i === files.length - 1 ? (
            <span className="text-gray-400">└──</span>
          ) : (
            <span className="text-gray-400">├──</span>
          )}
          <FaFileCode className="w-3 h-3 text-green-400" />
          <span>{file}</span>
        </div>
      ))}
    </div>
  );
};

export default NewProjectModal;