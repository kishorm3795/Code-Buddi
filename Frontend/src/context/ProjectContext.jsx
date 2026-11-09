import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  generateId,
  nowISO,
  createFileNode,
  createFolderNode,
  findNodeById,
  findParentById,
  addNodeToTree,
  removeNodeFromTree,
  updateNodeInTree,
  moveNodeInTree,
  flattenTree,
  getAllFiles,
  updatePaths,
  createProject,
  saveProject,
  deleteProject,
  loadProjects,
  duplicateProject,
  exportProject,
  importProject,
  getStorageInfo,
  getLanguageFromExtension,
} from "../utils/projectStorage";

const ProjectContext = createContext(null);

/**
 * ProjectProvider - Manages project state and operations
 * Provides: projects, currentProject, file tree operations, persistence
 */
export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState(() => loadProjects());
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debounced auto-save
  const saveTimeoutRef = useRef(null);
  const isSavingRef = useRef(false);

  // Auto-save current project
  const autoSave = useCallback((project) => {
    if (isSavingRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      isSavingRef.current = true;
      const result = saveProject(project);
      if (!result.success) {
        console.error('Auto-save failed:', result.error);
        setError(`Auto-save failed: ${result.error}`);
      }
      isSavingRef.current = false;
    }, 1000); // Debounce 1 second
  }, []);

  // Save projects to localStorage (called on any state change)
  useEffect(() => {
    const data = JSON.stringify(projects);
    localStorage.setItem('codebuddi-projects', data);
  }, [projects]);

  // Get current project
  const currentProject = currentProjectId
    ? projects.find((p) => p.id === currentProjectId) || null
    : null;

  // Create a new project
  const newProject = useCallback((name, language = 'javascript', template = 'blank') => {
    const project = createProject(name, language, template);
    setProjects((prev) => [...prev, project]);
    setCurrentProjectId(project.id);
    return project;
  }, []);

  // Open a project
  const openProject = useCallback((projectId) => {
    setCurrentProjectId(projectId);
    setError(null);
  }, []);

  // Close current project
  const closeProject = useCallback(() => {
    setCurrentProjectId(null);
  }, []);

  // Update current project (merge changes)
  const updateProject = useCallback((updates) => {
    if (!currentProject) return;

    const updated = { ...currentProject, ...updates, updatedAt: nowISO() };
    setProjects((prev) =>
      prev.map((p) => (p.id === currentProject.id ? updated : p))
    );
    autoSave(updated);
  }, [currentProject, autoSave]);

  // Set active file
  const setActiveFile = useCallback((fileId) => {
    if (!currentProject) return;
    updateProject({ activeFileId: fileId });
  }, [currentProject, updateProject]);

  // Update project settings
  const updateSettings = useCallback((settings) => {
    if (!currentProject) return;
    updateProject({ settings: { ...currentProject.settings, ...settings } });
  }, [currentProject, updateProject]);

  // ===== FILE TREE OPERATIONS =====

  // Create a new file
  const createFile = useCallback((name, parentId = null, content = '') => {
    if (!currentProject) return null;

    const parent = parentId ? findNodeById(currentProject.files, parentId) : null;
    const language = getLanguageFromExtension(name);

    const newFile = createFileNode(name, parentId, content, language);
    if (parent) {
      newFile.path = parent.path ? `${parent.path}/${name}` : name;
    } else {
      newFile.path = name;
    }

    const updatedFiles = addNodeToTree(currentProject.files, parentId, newFile);
    updateProject({ files: updatedFiles });
    setActiveFile(newFile.id);
    return newFile;
  }, [currentProject, updateProject, setActiveFile]);

  // Create a new folder
  const createFolder = useCallback((name, parentId = null) => {
    if (!currentProject) return null;

    const parent = parentId ? findNodeById(currentProject.files, parentId) : null;
    const newFolder = createFolderNode(name, parentId);
    if (parent) {
      newFolder.path = parent.path ? `${parent.path}/${name}` : name;
    } else {
      newFolder.path = name;
    }

    const updatedFiles = addNodeToTree(currentProject.files, parentId, newFolder);
    updateProject({ files: updatedFiles });
    return newFolder;
  }, [currentProject, updateProject]);

  // Rename a file/folder
  const renameNode = useCallback((nodeId, newName) => {
    if (!currentProject) return;

    const node = findNodeById(currentProject.files, nodeId);
    if (!node) return;

    const oldPath = node.path;
    const parent = findParentById(currentProject.files, nodeId);
    const newPath = parent ? `${parent.path}/${newName}` : newName;

    // Update this node and all descendants' paths
    const updatePathsRecursive = (nodes) => {
      return nodes.map((n) => {
        if (n.id === nodeId || (n.path && n.path.startsWith(oldPath + '/'))) {
          const updated = { ...n };
          if (n.id === nodeId) {
            updated.name = newName;
          }
          updated.path = n.path.replace(oldPath, newPath);
          if (n.type === 'folder' && n.children.length > 0) {
            updated.children = updatePathsRecursive(n.children);
          }
          return updated;
        }
        if (n.type === 'folder' && n.children.length > 0) {
          return { ...n, children: updatePathsRecursive(n.children) };
        }
        return n;
      });
    };

    const updatedFiles = updatePathsRecursive(currentProject.files);
    updateProject({ files: updatedFiles });
  }, [currentProject, updateProject]);

  // Delete a file/folder
  const deleteNode = useCallback((nodeId) => {
    if (!currentProject) return;

    // If deleting active file, clear active file
    if (currentProject.activeFileId === nodeId) {
      // Find next file to activate
      const allFiles = getAllFiles(currentProject.files);
      const currentIndex = allFiles.findIndex((f) => f.id === nodeId);
      const nextFile = allFiles[currentIndex + 1] || allFiles[currentIndex - 1] || null;
      updateProject({ activeFileId: nextFile?.id || null });
    }

    const updatedFiles = removeNodeFromTree(currentProject.files, nodeId);
    updateProject({ files: updatedFiles });
  }, [currentProject, updateProject]);

  // Move a node to a new parent
  const moveNode = useCallback((nodeId, newParentId) => {
    if (!currentProject) return;

    const node = findNodeById(currentProject.files, nodeId);
    if (!node) return;

    const newParent = newParentId ? findNodeById(currentProject.files, newParentId) : null;
    const newPath = newParent ? `${newParent.path}/${node.name}` : node.name;

    // Update paths for node and descendants
    const updateMovedPaths = (nodes, oldPath, newPath) => {
      return nodes.map((n) => {
        if (n.id === nodeId || (n.path && n.path.startsWith(oldPath + '/'))) {
          const updated = { ...n, parentId: n.id === nodeId ? newParentId : n.parentId };
          updated.path = n.path.replace(oldPath, newPath);
          if (n.type === 'folder' && n.children.length > 0) {
            updated.children = updateMovedPaths(n.children, oldPath, newPath);
          }
          return updated;
        }
        if (n.type === 'folder' && n.children.length > 0) {
          return { ...n, children: updateMovedPaths(n.children, oldPath, newPath) };
        }
        return n;
      });
    };

    // First remove from old location, then add to new
    let withoutNode = removeNodeFromTree(currentProject.files, nodeId);
    const movedNode = { ...node, parentId: newParentId, path: newPath };
    const updatedFiles = addNodeToTree(withoutNode, newParentId, movedNode);

    // Fix paths for descendants
    const finalFiles = updateMovedPaths(updatedFiles, node.path, newPath);

    updateProject({ files: finalFiles });
  }, [currentProject, updateProject]);

  // Update file content
  const updateFileContent = useCallback((fileId, content) => {
    if (!currentProject) return;

    const updatedFiles = updateNodeInTree(currentProject.files, fileId, {
      content,
      isDirty: true,
      updatedAt: nowISO(),
    });
    updateProject({ files: updatedFiles });
  }, [currentProject, updateProject]);

  // Mark file as saved (not dirty)
  const markFileSaved = useCallback((fileId) => {
    if (!currentProject) return;
    const updatedFiles = updateNodeInTree(currentProject.files, fileId, {
      isDirty: false,
    });
    updateProject({ files: updatedFiles });
  }, [currentProject, updateProject]);

  // Duplicate a file/folder
  const duplicateNode = useCallback((nodeId) => {
    if (!currentProject) return;

    const node = findNodeById(currentProject.files, nodeId);
    if (!node) return;

    const parent = findParentById(currentProject.files, nodeId);
    const parentId = parent?.id || null;

    if (node.type === 'file') {
      const newName = node.name.replace(/\.([^.]+)$/, ' (copy).$1');
      createFile(newName, parentId, node.content);
    } else {
      const newName = `${node.name} (copy)`;
      const newFolder = createFolder(newName, parentId);
      // Recursively duplicate children
      const duplicateChildren = (children, newParentId) => {
        children.forEach((child) => {
          if (child.type === 'file') {
            createFile(child.name, newParentId, child.content);
          } else {
            const newChildFolder = createFolder(child.name, newParentId);
            if (child.children.length > 0) {
              duplicateChildren(child.children, newChildFolder.id);
            }
          }
        });
      };
      duplicateChildren(node.children, newFolder.id);
    }
  }, [currentProject, createFile, createFolder]);

  // ===== PROJECT OPERATIONS =====

  // Save current project explicitly
  const saveCurrentProject = useCallback(() => {
    if (!currentProject) return { success: false, error: 'No project open' };
    const result = saveProject(currentProject);
    if (result.success) {
      setError(null);
    } else {
      setError(result.error);
    }
    return result;
  }, [currentProject]);

  // Delete a project
  const removeProject = useCallback((projectId) => {
    const result = deleteProject(projectId);
    if (result.success) {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (currentProjectId === projectId) {
        setCurrentProjectId(null);
      }
      setError(null);
    } else {
      setError('Failed to delete project');
    }
    return result;
  }, [currentProjectId]);

  // Duplicate a project
  const copyProject = useCallback((projectId, newName) => {
    const result = duplicateProject(projectId, newName);
    if (result.success) {
      setProjects((prev) => [...prev, result.project]);
      setError(null);
    } else {
      setError(result.error);
    }
    return result;
  }, []);

  // Export project as downloadable JSON
  const downloadProject = useCallback((projectId) => {
    const data = exportProject(projectId);
    if (!data) return false;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.name.replace(/\s+/g, '-')}-${data.id.slice(0, 8)}.codebuddi`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }, []);

  // Import project from file
  const importProjectFile = useCallback((file, newName) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          const result = importProject(data, newName);
          if (result.success) {
            setProjects((prev) => [...prev, result.project]);
            setError(null);
          } else {
            setError(result.error);
          }
          resolve(result);
        } catch (err) {
          setError('Invalid project file');
          resolve({ success: false, error: 'Invalid project file' });
        }
      };
      reader.readAsText(file);
    });
  }, []);

  // Get all open files (for tab bar)
  const getOpenFiles = useCallback(() => {
    if (!currentProject) return [];
    return getAllFiles(currentProject.files);
  }, [currentProject]);

  // Get project tree for file explorer
  const getFileTree = useCallback(() => {
    if (!currentProject) return [];
    return currentProject.files;
  }, [currentProject]);

  // Get storage info
  const storageInfo = getStorageInfo();

  // Clear error
  const clearError = useCallback(() => setError(null), []);

  const value = {
    // State
    projects,
    currentProject,
    currentProjectId,
    isLoading,
    error,
    storageInfo,

    // Project operations
    newProject,
    openProject,
    closeProject,
    updateProject,
    saveCurrentProject,
    removeProject,
    copyProject,
    downloadProject,
    importProjectFile,

    // File operations
    createFile,
    createFolder,
    renameNode,
    deleteNode,
    moveNode,
    duplicateNode,
    updateFileContent,
    markFileSaved,
    setActiveFile,

    // Settings
    updateSettings,

    // Derived data
    getOpenFiles,
    getFileTree,

    // Utility
    clearError,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

/**
 * useProject Hook
 * Returns project context with all operations
 */
export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

export default useProject;