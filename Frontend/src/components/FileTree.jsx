import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  FaFileCode, FaFolder, FaFolderOpen, FaPlus, FaTrash, FaEdit, FaCopy,
  FaChevronRight, FaChevronDown, FaSave, FaDownload, FaFileAlt
} from "react-icons/fa";
import { useProject } from "../hooks/useProject";

const FileTreeNode = ({
  node,
  level = 0,
  isActive,
  expandedFolders,
  onToggleFolder,
  onSelectFile,
  onContextMenu,
  onRename,
  onDelete,
  onDuplicate,
  onNewFile,
  onNewFolder,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const inputRef = useRef(null);
  const nodeRef = useRef(null);

  const isFolder = node.type === 'folder';
  const isExpanded = expandedFolders.has(node.id);
  const hasChildren = isFolder && node.children.length > 0;

  const handleClick = (e) => {
    e.stopPropagation();
    if (isFolder) {
      onToggleFolder(node.id);
    } else {
      onSelectFile(node.id);
    }
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (isFolder) {
      onToggleFolder(node.id);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e.clientX, e.clientY, node);
  };

  const handleRenameStart = () => {
    setRenameValue(node.name);
    setIsRenaming(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleRenameConfirm = () => {
    if (renameValue.trim() && renameValue !== node.name) {
      onRename(node.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = () => {
    setRenameValue(node.name);
    setIsRenaming(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleRenameConfirm();
    } else if (e.key === 'Escape') {
      handleRenameCancel();
    }
  };

  const getFileIcon = () => {
    if (isFolder) {
      return isExpanded ? <FaFolderOpen className="text-yellow-400" /> : <FaFolder className="text-yellow-400" />;
    }
    // Language-specific icons could be added here
    return <FaFileCode className="text-green-400" />;
  };

  const indent = level * 16;

  return (
    <div ref={nodeRef} className="select-none">
      <div
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        className={`
          flex items-center px-2 py-1.5 rounded transition-colors
          ${isActive ? 'bg-green-500/20 text-green-400' : 'text-gray-300 dark:text-gray-200 hover:bg-gray-700/50'}
          hacker-border-sm
        `}
        style={{ paddingLeft: `${8 + indent}px` }}
        title={node.path}
      >
        {/* Expand/Collapse Chevron */}
        {hasChildren && (
          <span className="w-5 flex items-center justify-center select-none">
            {isExpanded ? (
              <FaChevronDown className="text-xs text-gray-400" />
            ) : (
              <FaChevronRight className="text-xs text-gray-400" />
            )}
          </span>
        )}
        {!hasChildren && <span className="w-5" />}

        {/* Icon */}
        <span className="w-5 flex items-center justify-center">
          {getFileIcon()}
        </span>

        {/* Name / Rename Input */}
        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameConfirm}
            onKeyDown={handleKeyDown}
            className="flex-1 px-1 py-0.5 bg-gray-800 border border-green-500/50 rounded text-sm text-green-400 focus:outline-none focus:ring-1 focus:ring-green-500"
            autoFocus
          />
        ) : (
          <span className="flex-1 truncate text-sm font-mono" title={node.name}>
            {node.name}
            {node.isDirty && !isFolder && <span className="ml-1 text-yellow-400">●</span>}
          </span>
        )}

        {/* Hover Actions */}
        {!isRenaming && (
          <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity ml-2">
            {isFolder && (
              <button
                onClick={(e) => { e.stopPropagation(); onNewFile(node.id); }}
                className="p-1 text-gray-500 hover:text-green-400 hover:bg-gray-700/50 rounded transition-colors"
                title="New File"
              >
                <FaFileAlt className="text-xs" />
              </button>
            )}
            {isFolder && (
              <button
                onClick={(e) => { e.stopPropagation(); onNewFolder(node.id); }}
                className="p-1 text-gray-500 hover:text-green-400 hover:bg-gray-700/50 rounded transition-colors"
                title="New Folder"
              >
                <FaFolder className="text-xs" />
              </button>
            )}
            {!isFolder && node.isDirty && (
              <button
                onClick={(e) => { e.stopPropagation(); onRename(node.id, node.name); }}
                className="p-1 text-gray-500 hover:text-green-400 hover:bg-gray-700/50 rounded transition-colors"
                title="Save"
              >
                <FaSave className="text-xs" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Children */}
      {isFolder && isExpanded && (
        <div className="overflow-hidden">
          {node.children.map((child) => (
            <FileTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              isActive={isActive}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onSelectFile={onSelectFile}
              onContextMenu={onContextMenu}
              onRename={onRename}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onNewFile={onNewFile}
              onNewFolder={onNewFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileTree = () => {
  const {
    currentProject,
    getFileTree,
    createFile,
    createFolder,
    renameNode,
    deleteNode,
    duplicateNode,
    setActiveFile,
    updateFileContent,
    markFileSaved,
    downloadProject,
  } = useProject();

  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, node: null });

  // Auto-expand folders for active file
  useEffect(() => {
    if (currentProject?.activeFileId) {
      const expandParents = (nodes, targetId) => {
        for (const node of nodes) {
          if (node.type === 'folder') {
            const found = expandParents(node.children, targetId);
            if (found || node.children.some(c => c.id === targetId)) {
              setExpandedFolders(prev => new Set([...prev, node.id]));
              return true;
            }
          } else if (node.id === targetId) {
            return true;
          }
        }
        return false;
      };
      expandParents(getFileTree(), currentProject.activeFileId);
    }
  }, [currentProject?.activeFileId, getFileTree]);

  const toggleFolder = useCallback((folderId) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const handleContextMenu = useCallback((x, y, node) => {
    setContextMenu({ visible: true, x, y, node });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0, node: null });
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => closeContextMenu();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [closeContextMenu]);

  const handleNewFile = useCallback((parentId) => {
    closeContextMenu();
    // Create a new file with a temporary name, then trigger rename
    const newFile = createFile('new-file.txt', parentId);
    if (newFile) {
      // Trigger rename after a tick
      setTimeout(() => {
        // We'll handle rename via context menu action
      }, 0);
    }
  }, [createFile, closeContextMenu]);

  const handleNewFolder = useCallback((parentId) => {
    closeContextMenu();
    createFolder('new-folder', parentId);
  }, [createFolder, closeContextMenu]);

  const handleRename = useCallback((nodeId) => {
    closeContextMenu();
    // The FileTreeNode handles rename UI internally
    // We just need to ensure the node exists
  }, [closeContextMenu]);

  const handleDelete = useCallback((nodeId) => {
    closeContextMenu();
    if (window.confirm('Delete this item?')) {
      deleteNode(nodeId);
    }
  }, [deleteNode, closeContextMenu]);

  const handleDuplicate = useCallback((nodeId) => {
    closeContextMenu();
    duplicateNode(nodeId);
  }, [duplicateNode, closeContextMenu]);

  if (!currentProject) {
    return (
      <div className="flex flex-col h-full bg-gray-50/50 dark:bg-gray-900/40 border-r border-gray-200 dark:border-green-500/10 hacker-glass">
        <div className="p-4 border-b border-gray-200 dark:border-green-500/10">
          <h3 className="text-sm font-bold text-gray-600 dark:text-green-400 uppercase tracking-wider">
            File Explorer
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 px-4">
          <p className="text-sm text-center">Open or create a project to see files</p>
        </div>
      </div>
    );
  }

  const fileTree = getFileTree();

  return (
    <div className="flex flex-col h-full bg-gray-50/50 dark:bg-gray-900/40 border-r border-gray-200 dark:border-green-500/10 hacker-glass">
      {/* Toolbar */}
      <div className="p-3 border-b border-gray-200 dark:border-green-500/10 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-600 dark:text-green-400 uppercase tracking-wider flex items-center gap-2">
          <FaFileCode className="text-green-500" />
          {currentProject.name}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => createFolder(null)}
            className="p-1.5 text-gray-500 hover:text-green-400 hover:bg-gray-700/50 rounded transition-colors"
            title="New Folder"
          >
            <FaFolder className="text-sm" />
          </button>
          <button
            onClick={() => createFile('new-file.txt', null)}
            className="p-1.5 text-gray-500 hover:text-green-400 hover:bg-gray-700/50 rounded transition-colors"
            title="New File"
          >
            <FaFileAlt className="text-sm" />
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {fileTree.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FaFolder className="text-3xl mx-auto mb-2 opacity-30" />
            <p className="text-sm">No files yet</p>
            <p className="text-xs mt-1">Click + to add files or folders</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {fileTree.map((node) => (
              <FileTreeNode
                key={node.id}
                node={node}
                isActive={currentProject.activeFileId === node.id}
                expandedFolders={expandedFolders}
                onToggleFolder={toggleFolder}
                onSelectFile={setActiveFile}
                onContextMenu={handleContextMenu}
                onRename={handleRename}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onNewFile={handleNewFile}
                onNewFolder={handleNewFolder}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.node && (
        <div
          className="fixed z-50 hacker-glass hacker-border rounded-lg shadow-xl py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => { handleNewFile(contextMenu.node.id); }}
            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-green-500/20 hover:text-green-400 flex items-center gap-2"
          >
            <FaFileAlt className="text-xs" /> New File
          </button>
          {contextMenu.node.type === 'folder' && (
            <button
              onClick={() => { handleNewFolder(contextMenu.node.id); }}
              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-green-500/20 hover:text-green-400 flex items-center gap-2"
            >
              <FaFolder className="text-xs" /> New Folder
            </button>
          )}
          <div className="border-t border-gray-700 my-1" />
          <button
            onClick={() => { handleRename(contextMenu.node.id); }}
            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-green-500/20 hover:text-green-400 flex items-center gap-2"
          >
            <FaEdit className="text-xs" /> Rename
          </button>
          <button
            onClick={() => { handleDuplicate(contextMenu.node.id); }}
            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-green-500/20 hover:text-green-400 flex items-center gap-2"
          >
            <FaCopy className="text-xs" /> Duplicate
          </button>
          <div className="border-t border-gray-700 my-1" />
          <button
            onClick={() => { handleDelete(contextMenu.node.id); }}
            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300 flex items-center gap-2"
          >
            <FaTrash className="text-xs" /> Delete
          </button>
        </div>
      )}

      {/* Project Info Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-green-500/10 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2 mb-1">
          <FaDownload className="text-xs" />
          <button
            onClick={() => {
              if (currentProject?.id) {
                downloadProject(currentProject.id);
              }
            }}
            className="hover:text-green-400 underline"
          >
            Export Project
          </button>
        </div>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-500">
          {getAllFiles(fileTree).length} file{getAllFiles(fileTree).length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};

// Helper to get all files (needed in FileTree)
const getAllFiles = (nodes) => {
  const result = [];
  const traverse = (n) => {
    for (const node of n) {
      if (node.type === 'file') result.push(node);
      else if (node.children.length > 0) traverse(node.children);
    }
  };
  traverse(nodes);
  return result;
};

export default FileTree;