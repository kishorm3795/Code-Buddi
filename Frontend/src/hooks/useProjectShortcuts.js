import { useEffect } from 'react';

/**
 * useProjectShortcuts Hook
 * Handles keyboard shortcuts within the project editor
 * Supported shortcuts:
 * - Cmd/Ctrl + P: Open quick file search modal
 * - Cmd/Ctrl + S: Save active file
 * - Cmd/Ctrl + B: Toggle sidebar visibility
 * - Alt + W or Cmd/Ctrl + Shift + W: Close active tab
 */
export const useProjectShortcuts = ({
  onSearchFile,
  onSaveFile,
  onToggleSidebar,
  onCloseTab,
  enabled = true,
} = {}) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      const isModifier = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + P -> Quick Search
      if (isModifier && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        onSearchFile?.();
        return;
      }

      // Cmd/Ctrl + S -> Save File
      if (isModifier && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSaveFile?.();
        return;
      }

      // Cmd/Ctrl + B -> Toggle Sidebar
      if (isModifier && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        onToggleSidebar?.();
        return;
      }

      // Alt + W or Cmd/Ctrl + Shift + W -> Close Tab
      if ((e.altKey && e.key.toLowerCase() === 'w') || (isModifier && e.shiftKey && e.key.toLowerCase() === 'w')) {
        e.preventDefault();
        onCloseTab?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onSearchFile, onSaveFile, onToggleSidebar, onCloseTab]);
};

export default useProjectShortcuts;
