/**
 * Project Statistics & Metrics Utility
 * Computes lines of code, language breakdown, file sizes, and project tree metrics
 */

/**
 * Calculate detailed statistics for a project tree
 * @param {Array} nodes - Tree nodes array
 * @returns {Object} Project statistics metrics
 */
export const calculateProjectStats = (nodes = []) => {
  let totalFiles = 0;
  let totalFolders = 0;
  let totalLines = 0;
  let totalCharacters = 0;
  const languages = {};
  let largestFile = null;

  const traverse = (nodeList) => {
    if (!Array.isArray(nodeList)) return;

    for (const node of nodeList) {
      if (node.type === 'folder') {
        totalFolders += 1;
        if (Array.isArray(node.children)) {
          traverse(node.children);
        }
      } else if (node.type === 'file') {
        totalFiles += 1;
        const content = node.content || '';
        const lines = content.length > 0 ? content.split('\n').length : 0;
        const chars = content.length;

        totalLines += lines;
        totalCharacters += chars;

        const lang = node.language || 'plaintext';
        if (!languages[lang]) {
          languages[lang] = { fileCount: 0, lineCount: 0 };
        }
        languages[lang].fileCount += 1;
        languages[lang].lineCount += lines;

        if (!largestFile || lines > largestFile.lines) {
          largestFile = {
            id: node.id,
            name: node.name,
            lines,
            characters: chars,
          };
        }
      }
    }
  };

  traverse(nodes);

  return {
    totalFiles,
    totalFolders,
    totalLines,
    totalCharacters,
    languages,
    largestFile,
  };
};

/**
 * Format bytes into human-readable units (B, KB, MB)
 */
export const formatBytes = (bytes = 0) => {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};
