import { describe, it, expect } from 'vitest';
import { calculateProjectStats, formatBytes } from './projectStats.js';

describe('projectStats utility', () => {
  const sampleTree = [
    {
      id: 'f1',
      name: 'main.py',
      type: 'file',
      language: 'python',
      content: 'print("hello")\nprint("world")\n',
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
          language: 'javascript',
          content: 'export default function App() {\n  return <div>App</div>;\n}\n',
        },
      ],
    },
  ];

  it('calculates total files, folders, and lines across tree', () => {
    const stats = calculateProjectStats(sampleTree);

    expect(stats.totalFiles).toBe(2);
    expect(stats.totalFolders).toBe(1);
    expect(stats.totalLines).toBe(7); // 3 lines in python + 4 lines in jsx
    expect(stats.languages.python.fileCount).toBe(1);
    expect(stats.languages.javascript.fileCount).toBe(1);
    expect(stats.largestFile.name).toBe('App.jsx');
  });

  it('handles empty trees gracefully', () => {
    const stats = calculateProjectStats([]);

    expect(stats.totalFiles).toBe(0);
    expect(stats.totalFolders).toBe(0);
    expect(stats.totalLines).toBe(0);
    expect(stats.languages).toEqual({});
    expect(stats.largestFile).toBeNull();
  });

  it('formats byte numbers into human-readable strings', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512.0 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1048576)).toBe('1.0 MB');
  });
});
