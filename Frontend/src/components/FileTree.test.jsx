import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FileTree from './FileTree';
import * as ProjectHookModule from '../hooks/useProject';

describe('FileTree Component', () => {
  let mockContext;

  beforeEach(() => {
    mockContext = {
      currentProject: {
        id: 'proj-1',
        name: 'My Workspace',
        activeFileId: 'f-1',
        files: [
          { id: 'f-1', name: 'main.py', type: 'file', content: 'print(1)' },
          {
            id: 'd-1',
            name: 'src',
            type: 'folder',
            children: [
              { id: 'f-2', name: 'helper.py', type: 'file', content: 'def help(): pass' },
            ],
          },
        ],
      },
      getFileTree: vi.fn(() => [
        { id: 'f-1', name: 'main.py', type: 'file', content: 'print(1)' },
        {
          id: 'd-1',
          name: 'src',
          type: 'folder',
          children: [
            { id: 'f-2', name: 'helper.py', type: 'file', content: 'def help(): pass' },
          ],
        },
      ]),
      createFile: vi.fn(),
      createFolder: vi.fn(),
      renameNode: vi.fn(),
      deleteNode: vi.fn(),
      duplicateNode: vi.fn(),
      setActiveFile: vi.fn(),
      updateFileContent: vi.fn(),
      markFileSaved: vi.fn(),
      downloadProject: vi.fn(),
    };

    vi.spyOn(ProjectHookModule, 'useProject').mockReturnValue(mockContext);
  });

  it('renders explorer header with project name and file count', () => {
    render(<FileTree />);

    expect(screen.getByText('Explorer')).toBeInTheDocument();
    expect(screen.getByText('main.py')).toBeInTheDocument();
    expect(screen.getByText('src')).toBeInTheDocument();
  });

  it('selects active file when clicking file node', () => {
    render(<FileTree />);

    fireEvent.click(screen.getByText('main.py'));
    expect(mockContext.setActiveFile).toHaveBeenCalledWith('f-1');
  });

  it('triggers createFile when new file icon is clicked', () => {
    render(<FileTree />);

    const newFileBtn = screen.getByTitle('New File');
    fireEvent.click(newFileBtn);

    expect(mockContext.createFile).toHaveBeenCalled();
  });

  it('triggers createFolder when new folder icon is clicked', () => {
    render(<FileTree />);

    const newFolderBtn = screen.getByTitle('New Folder');
    fireEvent.click(newFolderBtn);

    expect(mockContext.createFolder).toHaveBeenCalled();
  });

  it('triggers exportProject when export button is clicked', () => {
    render(<FileTree />);

    const exportBtn = screen.getByText('Export Project');
    fireEvent.click(exportBtn);

    expect(mockContext.downloadProject).toHaveBeenCalledWith('proj-1');
  });
});
