/**
 * Project Storage Utility
 * Handles project persistence using localStorage (MVP) with IndexedDB fallback for larger projects
 */

const STORAGE_KEY = 'codebuddi-projects';
const MAX_LOCALSTORAGE_SIZE = 4.5 * 1024 * 1024; // ~4.5MB safe limit

/**
 * Generate a UUID v4
 */
export const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Get current ISO timestamp
 */
export const nowISO = () => new Date().toISOString();

/**
 * Create a new file node
 */
export const createFileNode = (name, parentId = null, content = '', language = 'plaintext') => ({
  id: generateId(),
  name,
  path: '', // Will be set when added to tree
  type: 'file',
  parentId,
  children: [],
  content,
  language: getLanguageFromExtension(name),
  isDirty: false,
  createdAt: nowISO(),
  updatedAt: nowISO(),
});

/**
 * Create a new folder node
 */
export const createFolderNode = (name, parentId = null) => ({
  id: generateId(),
  name,
  path: '',
  type: 'folder',
  parentId,
  children: [],
  createdAt: nowISO(),
  updatedAt: nowISO(),
});

/**
 * Infer language from file extension
 */
export const getLanguageFromExtension = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const langMap = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    json: 'json',
    md: 'markdown',
    txt: 'plaintext',
    c: 'c',
    cpp: 'cpp',
    cc: 'cpp',
    h: 'cpp',
    hpp: 'cpp',
    java: 'java',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    dart: 'dart',
    scala: 'scala',
    julia: 'julia',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
    yml: 'yaml',
    yaml: 'yaml',
    toml: 'toml',
    xml: 'xml',
    svg: 'xml',
    dockerfile: 'dockerfile',
    tf: 'terraform',
  };
  return langMap[ext] || 'plaintext';
};

/**
 * Update all paths in a file tree based on parent path
 */
export const updatePaths = (nodes, parentPath = '') => {
  return nodes.map((node) => {
    const newPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    const updated = { ...node, path: newPath };
    if (node.type === 'folder' && node.children.length > 0) {
      updated.children = updatePaths(node.children, newPath);
    }
    return updated;
  });
};

/**
 * Find a node by ID in the tree
 */
export const findNodeById = (nodes, id) => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.type === 'folder' && node.children.length > 0) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Find parent of a node by ID
 */
export const findParentById = (nodes, id, parent = null) => {
  for (const node of nodes) {
    if (node.id === id) return parent;
    if (node.type === 'folder' && node.children.length > 0) {
      const found = findParentById(node.children, id, node);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Add a node to the tree under a parent
 */
export const addNodeToTree = (nodes, parentId, newNode) => {
  if (!parentId) {
    return [...nodes, newNode];
  }
  return nodes.map((node) => {
    if (node.id === parentId && node.type === 'folder') {
      const updatedChildren = [...node.children, newNode];
      return {
        ...node,
        children: updatePaths(updatedChildren, node.path),
        updatedAt: nowISO(),
      };
    }
    if (node.type === 'folder' && node.children.length > 0) {
      return {
        ...node,
        children: addNodeToTree(node.children, parentId, newNode),
      };
    }
    return node;
  });
};

/**
 * Remove a node from the tree
 */
export const removeNodeFromTree = (nodes, id) => {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => {
      if (node.type === 'folder' && node.children.length > 0) {
        return {
          ...node,
          children: removeNodeFromTree(node.children, id),
        };
      }
      return node;
    });
};

/**
 * Update a node in the tree
 */
export const updateNodeInTree = (nodes, id, updates) => {
  return nodes.map((node) => {
    if (node.id === id) {
      return { ...node, ...updates, updatedAt: nowISO() };
    }
    if (node.type === 'folder' && node.children.length > 0) {
      return {
        ...node,
        children: updateNodeInTree(node.children, id, updates),
      };
    }
    return node;
  });
};

/**
 * Move a node to a new parent
 */
export const moveNodeInTree = (nodes, nodeId, newParentId) => {
  // First, find and remove the node
  let movedNode = null;
  const withoutNode = removeNodeFromTree(nodes, nodeId);

  // Find the node in the original tree
  const findNode = (n) => {
    for (const node of n) {
      if (node.id === nodeId) return node;
      if (node.type === 'folder') {
        const found = findNode(node.children);
        if (found) return found;
      }
    }
    return null;
  };
  movedNode = findNode(nodes);

  if (!movedNode) return nodes;

  // Update the moved node's parentId
  movedNode = { ...movedNode, parentId: newParentId };

  // Add to new parent
  return addNodeToTree(withoutNode, newParentId, movedNode);
};

/**
 * Flatten tree to array of all nodes
 */
export const flattenTree = (nodes) => {
  const result = [];
  const traverse = (n) => {
    for (const node of n) {
      result.push(node);
      if (node.type === 'folder' && node.children.length > 0) {
        traverse(node.children);
      }
    }
  };
  traverse(nodes);
  return result;
};

/**
 * Get all file nodes (not folders)
 */
export const getAllFiles = (nodes) => {
  return flattenTree(nodes).filter((n) => n.type === 'file');
};

export const PROJECT_TEMPLATES = [
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

export const getTemplates = () => PROJECT_TEMPLATES;

export const getTemplate = (id) => PROJECT_TEMPLATES.find((t) => t.id === id);

export const createProjectFromTemplate = (templateId, name) => {
  const t = getTemplate(templateId);
  const lang = t?.defaultLanguage || 'javascript';
  return createProject(name, lang, templateId);
};

/**
 * Create a new project with default structure
 */
export const createProject = (name, language = 'javascript', template = 'blank') => {
  const projectId = generateId();
  const now = nowISO();

  // Get template files
  const templateFiles = getTemplateFiles(template, language);

  const files = templateFiles.map((f) =>
    createFileNode(f.name, null, f.content, f.language)
  );

  const filesWithPaths = updatePaths(files);

  return {
    id: projectId,
    name,
    language,
    template,
    createdAt: now,
    updatedAt: now,
    files: filesWithPaths,
    activeFileId: filesWithPaths[0]?.id || null,
    settings: {
      fontSize: 14,
      theme: 'vs-dark',
      tabSize: 2,
      wordWrap: 'on',
      minimap: false,
    },
  };
};

/**
 * Get template files for a project type
 */
const getTemplateFiles = (template, language) => {
  const templates = {
    blank: [
      { name: getDefaultEntryFile(language), content: getDefaultCode(language), language },
    ],
    react: [
      { name: 'package.json', content: getReactPackageJson(), language: 'json' },
      { name: 'index.html', content: getReactIndexHtml(), language: 'html' },
      { name: 'src/main.jsx', content: getReactMainJsx(), language: 'javascript' },
      { name: 'src/App.jsx', content: getReactAppJsx(), language: 'javascript' },
      { name: 'src/App.css', content: getReactAppCss(), language: 'css' },
      { name: '.gitignore', content: getGitIgnore(), language: 'plaintext' },
    ],
    python: [
      { name: 'main.py', content: getPythonMain(), language: 'python' },
      { name: 'requirements.txt', content: '', language: 'plaintext' },
      { name: 'README.md', content: getPythonReadme(), language: 'markdown' },
      { name: '.gitignore', content: getPythonGitIgnore(), language: 'plaintext' },
    ],
    node: [
      { name: 'package.json', content: getNodePackageJson(), language: 'json' },
      { name: 'index.js', content: getNodeIndexJs(), language: 'javascript' },
      { name: '.gitignore', content: getGitIgnore(), language: 'plaintext' },
    ],
    go: [
      { name: 'main.go', content: getGoMain(), language: 'go' },
      { name: 'go.mod', content: getGoMod(), language: 'plaintext' },
      { name: 'README.md', content: getGoReadme(), language: 'markdown' },
    ],
    rust: [
      { name: 'Cargo.toml', content: getRustCargoToml(), language: 'toml' },
      { name: 'src/main.rs', content: getRustMain(), language: 'rust' },
      { name: '.gitignore', content: getRustGitIgnore(), language: 'plaintext' },
    ],
  };
  return templates[template] || templates.blank;
};

/**
 * Get default entry file name for language
 */
const getDefaultEntryFile = (language) => {
  const entryFiles = {
    python: 'main.py',
    javascript: 'index.js',
    typescript: 'index.ts',
    java: 'Main.java',
    csharp: 'Program.cs',
    go: 'main.go',
    rust: 'main.rs',
    ruby: 'main.rb',
    php: 'index.php',
    swift: 'main.swift',
    kotlin: 'Main.kt',
    dart: 'main.dart',
    scala: 'Main.scala',
    julia: 'main.jl',
    c: 'main.c',
    cpp: 'main.cpp',
    html: 'index.html',
    css: 'style.css',
  };
  return entryFiles[language] || 'main.txt';
};

/**
 * Get default starter code for language
 */
const getDefaultCode = (language) => {
  const codes = {
    python: 'print("Hello, CodeBuddi!")\n',
    javascript: 'console.log("Hello, CodeBuddi!");\n',
    typescript: 'console.log("Hello, CodeBuddi!");\n',
    java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, CodeBuddi!");\n    }\n}\n',
    csharp: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, CodeBuddi!");\n    }\n}\n',
    go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, CodeBuddi!")\n}\n',
    rust: 'fn main() {\n    println!("Hello, CodeBuddi!");\n}\n',
    ruby: 'puts "Hello, CodeBuddi!"\n',
    php: '<?php\n\necho "Hello, CodeBuddi!";\n',
    swift: 'print("Hello, CodeBuddi!")\n',
    kotlin: 'fun main() {\n    println("Hello, CodeBuddi!")\n}\n',
    dart: 'void main() {\n  print("Hello, CodeBuddi!");\n}\n',
    scala: 'object Main extends App {\n  println("Hello, CodeBuddi!")\n}\n',
    julia: 'println("Hello, CodeBuddi!")\n',
    c: '#include <stdio.h>\n\nint main() {\n    printf("Hello, CodeBuddi!\\n");\n    return 0;\n}\n',
    cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, CodeBuddi!" << std::endl;\n    return 0;\n}\n',
    html: '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>CodeBuddi</title>\n</head>\n<body>\n    <h1>Hello, CodeBuddi!</h1>\n</body>\n</html>\n',
    css: '/* CodeBuddi Styles */\n\nbody {\n    font-family: system-ui, sans-serif;\n    padding: 2rem;\n}\n\nh1 {\n    color: #00f0ff;\n}\n',
  };
  return codes[language] || '';
};

// Template file contents
const getReactPackageJson = () => `{
  "name": "codebuddi-react-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  }
}`;

const getReactIndexHtml = () => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeBuddi React App</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
</body>
</html>`;

const getReactMainJsx = () => `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;

const getReactAppJsx = () => `import './App.css';

function App() {
  return (
    <div className="app">
      <header>
        <h1>CodeBuddi React App</h1>
      </header>
      <main>
        <p>Welcome to your new React project!</p>
      </main>
    </div>
  );
}

export default App;`;

const getReactAppCss = () => `.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
  color: #00f0ff;
  font-family: 'JetBrains Mono', monospace;
}

header h1 {
  font-size: 2.5rem;
  text-shadow: 0 0 20px #00f0ff;
}

main p {
  font-size: 1.2rem;
  opacity: 0.8;
}`;

const getGitIgnore = () => `node_modules/
dist/
build/
.env
*.log
.DS_Store`;

const getPythonMain = () => `#!/usr/bin/env python3
"""CodeBuddi Python Project"""

def main():
    print("Hello, CodeBuddi!")

if __name__ == "__main__":
    main()`;

const getPythonReadme = () => `# CodeBuddi Python Project

A new Python project created with CodeBuddi.

## Running

\`\`\`bash
python main.py
\`\`\``;

const getPythonGitIgnore = () => `__pycache__/
*.pyc
.env
venv/
.DS_Store`;

const getNodePackageJson = () => `{
  "name": "codebuddi-node-app",
  "version": "1.0.0",
  "description": "A Node.js project created with CodeBuddi",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "keywords": [],
  "author": "",
  "license": "MIT"
}`;

const getNodeIndexJs = () => `// CodeBuddi Node.js Project

console.log("Hello, CodeBuddi!");`;


const getGoMain = () => `package main

import "fmt"

func main() {
    fmt.Println("Hello, CodeBuddi!")
}`;

const getGoMod = () => `module codebuddi-go

go 1.21`;

const getGoReadme = () => `# CodeBuddi Go Project

A new Go project created with CodeBuddi.

## Running

\`\`\`bash
go run main.go
\`\`\``;

const getRustCargoToml = () => `[package]
name = "codebuddi-rust"
version = "0.1.0"
edition = "2021"

[dependencies]`;

const getRustMain = () => `// CodeBuddi Rust Project

fn main() {
    println!("Hello, CodeBuddi!");
}`;

const getRustGitIgnore = () => `target/
Cargo.lock
.DS_Store`;

/**
 * Save projects to localStorage
 */
export const saveProjects = (projects) => {
  try {
    const data = JSON.stringify(projects);
    // Check size before saving
    if (data.length > MAX_LOCALSTORAGE_SIZE) {
      console.warn('Project data exceeds localStorage limit, consider IndexedDB');
      return { success: false, error: 'Data too large for localStorage' };
    }
    localStorage.setItem(STORAGE_KEY, data);
    return { success: true };
  } catch (error) {
    console.error('Failed to save projects:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Load projects from localStorage
 */
export const loadProjects = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const projects = JSON.parse(data);
    // Ensure all projects have proper structure
    return projects.map(ensureProjectStructure);
  } catch (error) {
    console.error('Failed to load projects:', error);
    return [];
  }
};

/**
 * Ensure project has all required fields
 */
const ensureProjectStructure = (project) => {
  return {
    ...project,
    files: project.files || [],
    activeFileId: project.activeFileId || null,
    settings: {
      fontSize: 14,
      theme: 'vs-dark',
      tabSize: 2,
      wordWrap: 'on',
      minimap: false,
      ...project.settings,
    },
  };
};

/**
 * Get a single project by ID
 */
export const getProject = (projectId) => {
  const projects = loadProjects();
  return projects.find((p) => p.id === projectId) || null;
};

/**
 * Save a single project (update or create)
 */
export const saveProject = (project) => {
  const projects = loadProjects();
  const index = projects.findIndex((p) => p.id === project.id);
  const updatedProject = {
    ...project,
    updatedAt: nowISO(),
    files: updatePaths(project.files), // Ensure paths are correct
  };

  if (index >= 0) {
    projects[index] = updatedProject;
  } else {
    projects.push(updatedProject);
  }

  return saveProjects(projects);
};

/**
 * Delete a project
 */
export const deleteProject = (projectId) => {
  const projects = loadProjects().filter((p) => p.id !== projectId);
  return saveProjects(projects);
};

/**
 * Duplicate a project
 */
export const duplicateProject = (projectId, newName) => {
  const project = getProject(projectId);
  if (!project) return { success: false, error: 'Project not found' };

  const newProject = {
    ...project,
    id: generateId(),
    name: newName || `${project.name} (copy)`,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };

  const result = saveProject(newProject);
  return { success: result.success, project: newProject };
};

/**
 * Export project as formatted JSON string (for file download/sharing)
 */
export const exportProjectAsJsonString = (projectId) => {
  const data = exportProject(projectId);
  if (!data) return null;
  return JSON.stringify(data, null, 2);
};

/**
 * Validate imported project schema structure
 */
export const validateProjectSchema = (data) => {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Project data must be a valid JSON object' };
  }
  if (!data.name || typeof data.name !== 'string') {
    return { valid: false, error: 'Project must contain a valid string name' };
  }
  if (!data.files || typeof data.files !== 'object') {
    return { valid: false, error: 'Project must contain files collection' };
  }
  return { valid: true, error: null };
};

/**
 * Import project from raw JSON string with validation
 */
export const importProjectFromJsonString = (jsonString, options = {}) => {
  try {
    const parsed = JSON.parse(jsonString);
    const validation = validateProjectSchema(parsed);
    if (!validation.valid) {
      return { success: false, error: validation.error, project: null };
    }
    return importProject(parsed, options.newName);
  } catch (err) {
    return { success: false, error: `Invalid JSON format: ${err.message}`, project: null };
  }
};

/**
 * Export project as JSON (for download)
 */
export const exportProject = (projectId) => {
  const project = getProject(projectId);
  if (!project) return null;

  return {
    ...project,
    exportedAt: nowISO(),
    version: '1.0',
  };
};

/**
 * Import project from JSON
 */
export const importProject = (projectData, newName) => {
  const project = {
    ...projectData,
    id: generateId(),
    name: newName || `${projectData.name} (imported)`,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };

  const result = saveProject(project);
  return { success: result.success, project };
};

/**
 * Get storage usage info
 */
export const getStorageInfo = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const size = data ? new Blob([data]).size : 0;
    const projects = loadProjects();
    return {
      used: size,
      limit: MAX_LOCALSTORAGE_SIZE,
      percent: Math.round((size / MAX_LOCALSTORAGE_SIZE) * 100),
      projectCount: projects.length,
      totalFiles: projects.reduce((sum, p) => sum + getAllFiles(p.files).length, 0),
    };
  } catch {
    return { used: 0, limit: MAX_LOCALSTORAGE_SIZE, percent: 0, projectCount: 0, totalFiles: 0 };
  }
};