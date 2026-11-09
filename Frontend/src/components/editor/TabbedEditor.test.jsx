import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TabbedEditor from './TabbedEditor';
import * as ProjectHookModule from '../../hooks/useProject';

// Mock LazyMonacoEditor for fast, lightweight testing
vi.mock('./LazyMonacoEditor', () => ({
  default: ({ value, language, onChange }) => (
    <textarea
      data-testid="monaco-mock"
      aria-label="Code Editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

describe('TabbedEditor Component', () => {
  let mockContext;

  beforeEach(() => {
    mockContext = {
      currentProject: {
        id: 'p-1',
        name: 'Workspace',
        activeFileId: 'f-1',
        openTabs: ['f-1', 'f-2'],
      },
      getOpenFiles: vi.fn(() => [
        { id: 'f-1', name: 'main.py', language: 'python', content: 'print(42)', isDirty: false },
        { id: 'f-2', name: 'styles.css', language: 'css', content: 'body {}', isDirty: true },
      ]),
      setActiveFile: vi.fn(),
      updateFileContent: vi.fn(),
      markFileSaved: vi.fn(),
      createFile: vi.fn(),
      deleteNode: vi.fn(),
      updateProject: vi.fn(),
    };

    vi.spyOn(ProjectHookModule, 'useProject').mockReturnValue(mockContext);
  });

  it('renders tab bar with open files', () => {
    render(<TabbedEditor isDarkMode={true} fontSize={14} isReadOnly={false} />);

    expect(screen.getByText('main.py')).toBeInTheDocument();
    expect(screen.getByText('styles.css')).toBeInTheDocument();
    expect(screen.getByTestId('monaco-mock')).toBeInTheDocument();
  });

  it('switches active tab when clicking an inactive tab', () => {
    render(<TabbedEditor isDarkMode={true} fontSize={14} isReadOnly={false} />);

    fireEvent.click(screen.getByText('styles.css'));
    expect(mockContext.setActiveFile).toHaveBeenCalledWith('f-2');
  });

  it('updates file content when user types in editor', () => {
    render(<TabbedEditor isDarkMode={true} fontSize={14} isReadOnly={false} />);

    const editor = screen.getByTestId('monaco-mock');
    fireEvent.change(editor, { target: { value: 'print(100)' } });

    expect(mockContext.updateFileContent).toHaveBeenCalledWith('f-1', 'print(100)');
  });

  it('renders empty placeholder when no files are open', () => {
    mockContext.getOpenFiles.mockReturnValue([]);
    mockContext.currentProject.activeFileId = null;

    render(<TabbedEditor isDarkMode={true} fontSize={14} isReadOnly={false} />);

    expect(screen.getByText('No file open')).toBeInTheDocument();
  });
});
