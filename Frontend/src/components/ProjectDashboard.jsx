import React, { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useProject } from "../hooks/useProject";
import ProjectCard from "./ProjectCard";
import NewProjectModal from "./NewProjectModal";
import { FaPlus, FaFolderOpen, FaSearch, FaDownload, FaUpload, FaCog, FaTimes, FaFilter, FaFileCode } from "react-icons/fa";

const ProjectDashboard = () => {
  const { projects, openProject, removeProject, copyProject, downloadProject, importProjectFile, newProject } = useProject();
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTemplate, setFilterTemplate] = useState("all");
  const [sortBy, setSortBy] = useState("updated"); // 'updated', 'created', 'name'
  const [importFile, setImportFile] = useState(null);

  // Sort projects
  const sortedProjects = useCallback(() => {
    let filtered = projects.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterTemplate === "all" || p.template === filterTemplate;
      return matchesSearch && matchesFilter;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "created":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "updated":
        default:
          return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
    });
  }, [projects, searchQuery, filterTemplate, sortBy]);

  const handleImport = useCallback(async () => {
    if (!importFile) return;
    await importProjectFile(importFile);
    setImportFile(null);
    setShowImportModal(false);
  }, [importFile, importProjectFile]);

  const templates = [
    { id: "blank", name: "Blank", description: "Start from scratch", icon: "📄" },
    { id: "react", name: "React", description: "React + Vite + JSX", icon: "⚛️" },
    { id: "python", name: "Python", description: "Python project with main.py", icon: "🐍" },
    { id: "node", name: "Node.js", description: "Node.js project with package.json", icon: "🟢" },
    { id: "go", name: "Go", description: "Go module with main.go", icon: "🐹" },
    { id: "rust", name: "Rust", description: "Rust project with Cargo.toml", icon: "🦀" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                <span className="text-xl font-bold bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
                  CodeBuddi
                </span>
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-green-500 transition-colors font-mono text-sm">
                  Playground
                </Link>
                <span className="text-green-500 font-mono text-sm">Projects</span>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="p-2 text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Import Project"
              >
                <FaUpload className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="px-4 py-2 bg-green-500 text-white font-mono text-sm rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                <FaPlus className="w-4 h-4" />
                New Project
              </button>
            </div>
          </div>
        </div>

        {/* Search/Filter Bar */}
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-3">
              <select
                value={filterTemplate}
                onChange={(e) => setFilterTemplate(e.target.value)}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Templates</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="updated">Recent First</option>
                <option value="created">Oldest First</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Bar */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex-1 min-w-[150px] bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hacker-glass">
            <div className="text-3xl font-bold text-green-500">{projects.length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Projects</div>
          </div>
          <div className="flex-1 min-w-[150px] bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hacker-glass">
            <div className="text-3xl font-bold text-blue-500">
              {projects.reduce((sum, p) => sum + getFileCount(p), 0)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Files</div>
          </div>
          <div className="flex-1 min-w-[150px] bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hacker-glass">
            <div className="text-3xl font-bold text-purple-500">
              {[...new Set(projects.map(p => p.template))].length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Templates Used</div>
          </div>
        </div>

        {/* Projects Grid */}
        {sortedProjects().length === 0 ? (
          <EmptyState onCreateClick={() => setShowNewProjectModal(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedProjects().map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => openProject(project.id)}
                onDuplicate={() => copyProject(project.id, `${project.name} (copy)`)}
                onDownload={() => downloadProject(project.id)}
                onDelete={() => {
                  if (window.confirm(`Delete "${project.name}"?`)) {
                    removeProject(project.id);
                  }
                }}
              />
            ))}
          </div>
        )}

        {/* New Project Button (Mobile) */}
        <div className="lg:hidden mt-8 text-center">
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="px-6 py-3 bg-green-500 text-white font-mono rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 mx-auto"
          >
            <FaPlus className="w-5 h-5" />
            Create New Project
          </button>
        </div>
      </main>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <NewProjectModal
          onClose={() => setShowNewProjectModal(false)}
          onCreate={(name, template, language) => {
            const project = newProject(name, language, template);
            if (project) {
              openProject(project.id);
            }
            setShowNewProjectModal(false);
          }}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl hacker-glass hacker-border p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Project</h2>
              <button onClick={() => setShowImportModal(false)} className="text-gray-500 hover:text-gray-700">
                <FaTimes className="w-6 h-6" />
              </button>
            </div>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center mb-4">
              <FaUpload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 dark:text-gray-300 mb-2">Drag & drop a .codebuddi file</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">or click to browse</p>
              <input
                type="file"
                accept=".codebuddi,.json"
                onChange={(e) => setImportFile(e.target.files[0])}
                className="hidden"
                id="import-file"
              />
              <label htmlFor="import-file" className="mt-3 inline-block px-4 py-2 bg-green-500 text-white rounded-lg cursor-pointer hover:bg-green-600">
                Choose File
              </label>
            </div>
            {importFile && (
              <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4">
                <FaFileCode className="text-green-500" />
                <span className="flex-1 truncate text-sm font-mono">{importFile.name}</span>
                <span className="text-xs text-gray-500">{(importFile.size / 1024).toFixed(1)} KB</span>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importFile}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper
const getFileCount = (project) => {
  const count = (nodes) => {
    let total = 0;
    for (const node of nodes) {
      if (node.type === 'file') total++;
      else if (node.children.length > 0) total += count(node.children);
    }
    return total;
  };
  return count(project.files || []);
};

const EmptyState = ({ onCreateClick }) => (
  <div className="text-center py-16">
    <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-2xl flex items-center justify-center">
      <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7h18M3 12h18M3 17h18M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
      </svg>
    </div>
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No projects found</h2>
    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
      Create your first project to start coding with multiple files, folders, and full IDE features.
    </p>
    <button
      onClick={onCreateClick}
      className="px-6 py-3 bg-green-500 text-white font-mono rounded-lg hover:bg-green-600 transition-colors inline-flex items-center gap-2"
    >
      <FaPlus className="w-5 h-5" />
      Create Project
    </button>
  </div>
);

export default ProjectDashboard;