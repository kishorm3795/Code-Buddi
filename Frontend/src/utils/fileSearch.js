/**
 * File Search & Path Matching Utility
 * Provides fast recursive search and filtering across multi-file project trees
 */

/**
 * Recursively flatten file tree nodes into an array of file items
 */
export const flattenFileTree = (nodes, parentPath = '') => {
  if (!nodes || !Array.isArray(nodes)) return [];

  const result = [];

  for (const node of nodes) {
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;

    if (node.type === 'file') {
      result.push({
        ...node,
        computedPath: node.path || currentPath,
      });
    } else if (node.type === 'folder' && Array.isArray(node.children)) {
      result.push(...flattenFileTree(node.children, currentPath));
    }
  }

  return result;
};

/**
 * Search files in a project tree by query string
 * @param {Array} nodes - Tree nodes or root children
 * @param {string} query - Search term
 * @param {Object} options - Search options
 */
export const searchFileTree = (nodes, query = '', options = {}) => {
  const { maxResults = 25, extensionFilter = null } = options;
  const cleanQuery = query.trim().toLowerCase();

  const allFiles = flattenFileTree(nodes);

  if (!cleanQuery && !extensionFilter) {
    return allFiles.slice(0, maxResults);
  }

  return allFiles
    .filter((file) => {
      const name = (file.name || '').toLowerCase();
      const path = (file.computedPath || file.path || '').toLowerCase();

      // Check extension filter if provided
      if (extensionFilter) {
        const fileExt = name.split('.').pop()?.toLowerCase();
        if (fileExt !== extensionFilter.toLowerCase()) {
          return false;
        }
      }

      if (!cleanQuery) return true;

      // Match name or path
      return name.includes(cleanQuery) || path.includes(cleanQuery);
    })
    .sort((a, b) => {
      // Prioritize exact filename match over path match
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aExact = aName === cleanQuery;
      const bExact = bName === cleanQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // Prioritize prefix match
      const aPrefix = aName.startsWith(cleanQuery);
      const bPrefix = bName.startsWith(cleanQuery);
      if (aPrefix && !bPrefix) return -1;
      if (!aPrefix && bPrefix) return 1;

      return aName.localeCompare(bName);
    })
    .slice(0, maxResults);
};
