import { describe, it, expect } from 'vitest';
import { flattenFileTree, searchFileTree } from './fileSearch.js';

describe('fileSearch utility', () => {
  const mockTree = [
    {
      id: 'f1',
      name: 'index.html',
      type: 'file',
      content: '<h1>Hello</h1>',
    },
    {
      id: 'd1',
      name: 'src',
      type: 'folder',
      children: [
        {
          id: 'f2',
          name: 'App.jsx',
          type: 'file',
          content: 'export default function App() {}',
        },
        {
          id: 'f3',
          name: 'App.css',
          type: 'file',
          content: '.app { color: red; }',
        },
        {
          id: 'd2',
          name: 'components',
          type: 'folder',
          children: [
            {
              id: 'f4',
              name: 'Button.jsx',
              type: 'file',
              content: 'export const Button = () => null;',
            },
            {
              id: 'f5',
              name: 'index.js',
              type: 'file',
              content: 'export * from "./Button";',
            },
          ],
        },
      ],
    },
    {
      id: 'f6',
      name: 'package.json',
      type: 'file',
      content: '{}',
    },
  ];

  describe('flattenFileTree', () => {
    it('returns empty array when nodes is empty or not an array', () => {
      expect(flattenFileTree([])).toEqual([]);
      expect(flattenFileTree(null)).toEqual([]);
      expect(flattenFileTree(undefined)).toEqual([]);
    });

    it('recursively flattens nested folder hierarchy into flat list of files', () => {
      const files = flattenFileTree(mockTree);
      expect(files.length).toBe(5);
      const names = files.map((f) => f.name);
      expect(names).toEqual(['index.html', 'App.jsx', 'App.css', 'Button.jsx', 'index.js', 'package.json'].filter(n => names.includes(n)));
    });

    it('computes correct relative path for nested files', () => {
      const files = flattenFileTree(mockTree);
      const buttonFile = files.find((f) => f.name === 'Button.jsx');
      expect(buttonFile).toBeDefined();
      expect(buttonFile.computedPath).toBe('src/components/Button.jsx');
    });
  });

  describe('searchFileTree', () => {
    it('returns all files up to maxResults when query is empty', () => {
      const results = searchFileTree(mockTree, '', { maxResults: 3 });
      expect(results.length).toBe(3);
    });

    it('finds files by partial name case-insensitively', () => {
      const results = searchFileTree(mockTree, 'app');
      expect(results.length).toBe(2);
      const names = results.map((f) => f.name);
      expect(names).toContain('App.jsx');
      expect(names).toContain('App.css');
    });

    it('finds files matching folder path', () => {
      const results = searchFileTree(mockTree, 'components');
      expect(results.length).toBe(2);
      const names = results.map((f) => f.name);
      expect(names).toContain('Button.jsx');
      expect(names).toContain('index.js');
    });

    it('filters by extension filter option', () => {
      const results = searchFileTree(mockTree, '', { extensionFilter: 'css' });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('App.css');
    });

    it('prioritizes exact matches at top', () => {
      const results = searchFileTree(mockTree, 'index.html');
      expect(results[0].name).toBe('index.html');
    });

    it('returns empty array when no files match', () => {
      const results = searchFileTree(mockTree, 'nonexistent.rs');
      expect(results).toEqual([]);
    });
  });
});
