import { useProject as useProjectHook } from "../context/ProjectContext";

/**
 * useProject Hook
 * Returns {
 *   projects, currentProject, currentProjectId, isLoading, error, storageInfo,
 *   newProject, openProject, closeProject, updateProject, saveCurrentProject,
 *   removeProject, copyProject, downloadProject, importProjectFile,
 *   createFile, createFolder, renameNode, deleteNode, moveNode, duplicateNode,
 *   updateFileContent, markFileSaved, setActiveFile, updateSettings,
 *   getOpenFiles, getFileTree, clearError
 * }
 */
export const useProject = useProjectHook;

export default useProject;