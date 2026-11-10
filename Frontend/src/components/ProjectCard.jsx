import React, { useState } from "react";
import {
  FaFolderOpen, FaCopy, FaDownload, FaTrash, FaEdit,
  FaClock, FaFileCode, FaExternalLinkAlt, FaChevronDown
} from "react-icons/fa";

const templateIcons = {
  blank: "📄",
  react: "⚛️",
  python: "🐍",
  node: "🟢",
  go: "🐹",
  rust: "🦀",
};

const templateColors = {
  blank: "from-gray-500 to-gray-600",
  react: "from-blue-500 to-cyan-500",
  python: "from-yellow-500 to-orange-500",
  node: "from-green-500 to-emerald-500",
  go: "from-cyan-500 to-blue-500",
  rust: "from-orange-500 to-red-500",
};

const ProjectCard = ({ project, onOpen, onDuplicate, onDownload, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const fileCount = getFileCount(project.files);
  const templateInfo = templateIcons[project.template] ? project.template : 'blank';

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowMenu(false); }}
      className={`
        relative group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700
        overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1
        hacker-card-advanced
      `}
    >
      {/* Template Color Bar */}
      <div className={`h-2 bg-gradient-to-r ${templateColors[templateInfo] || templateColors.blank}`} />

      {/* Card Content */}
      <div className="p-5">
        {/* Header with template icon and menu */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br ${templateColors[templateInfo] || templateColors.blank} flex items-center justify-center text-2xl">
              {templateIcons[templateInfo] || templateIcons.blank}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white truncate max-w-[200px]">
                {project.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-300 font-mono">
                  {project.template}
                </span>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-300 font-mono">
                  {project.language}
                </span>
              </div>
            </div>
          </div>

          {/* Dropdown Menu */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Project options"
            >
              <FaChevronDown className="w-5 h-5" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 hacker-glass hacker-border rounded-lg shadow-xl py-1 min-w-[160px]">
                  <button
                    onClick={() => { onOpen(project.id); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-green-500/20 hover:text-green-400 flex items-center gap-2"
                  >
                    <FaFolderOpen className="w-4 h-4" /> Open Project
                  </button>
                  <button
                    onClick={() => { onDuplicate(project.id); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-green-500/20 hover:text-green-400 flex items-center gap-2"
                  >
                    <FaCopy className="w-4 h-4" /> Duplicate
                  </button>
                  <button
                    onClick={() => { onDownload(project.id); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-green-500/20 hover:text-green-400 flex items-center gap-2"
                  >
                    <FaDownload className="w-4 h-4" /> Download
                  </button>
                  <div className="border-t border-gray-700 my-1" />
                  <button
                    onClick={() => { onDelete(project.id); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300 flex items-center gap-2"
                  >
                    <FaTrash className="w-4 h-4" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
          <span className="flex items-center gap-1">
            <FaFileCode className="w-3.5 h-3.5" />
            {fileCount} file{fileCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <FaClock className="w-3.5 h-3.5" />
            Updated {formatDate(project.updatedAt)}
          </span>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onOpen(project.id)}
            className="flex-1 px-3 py-2 bg-green-500 text-white text-sm font-mono rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
          >
            <FaFolderOpen className="w-4 h-4" />
            Open Project
          </button>
          <button
            onClick={() => onDuplicate(project.id)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Duplicate"
          >
            <FaCopy className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDownload(project.id)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Download"
          >
            <FaDownload className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hover overlay with quick stats */}
      {isHovered && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-white dark:bg-gray-900 hacker-glass hacker-border rounded-lg p-4 text-center transform -translate-y-2 transition-transform">
            <div className="text-2xl font-bold text-green-500">{fileCount}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">files</div>
          </div>
        </div>
      )}
    </div>
  );
};

const getFileCount = (nodes) => {
  if (!nodes) return 0;
  let count = 0;
  for (const node of nodes) {
    if (node.type === 'file') count++;
    else if (node.children.length > 0) count += getFileCount(node.children);
  }
  return count;
};

export default ProjectCard;