import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProject } from './useProject';
import { ProjectProvider } from '../context/ProjectContext';

describe('useProject Hook', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
  });

  it('throws descriptive error when rendered outside ProjectProvider', () => {
    expect(() => renderHook(() => useProject())).toThrow(
      'useProject must be used within a ProjectProvider'
    );
  });

  it('provides all expected project operations when wrapped in ProjectProvider', () => {
    const wrapper = ({ children }) => <ProjectProvider>{children}</ProjectProvider>;
    const { result } = renderHook(() => useProject(), { wrapper });

    expect(result.current).toBeDefined();
    expect(Array.isArray(result.current.projects)).toBe(true);
    expect(typeof result.current.newProject).toBe('function');
    expect(typeof result.current.openProject).toBe('function');
    expect(typeof result.current.closeProject).toBe('function');
    expect(typeof result.current.createFile).toBe('function');
    expect(typeof result.current.createFolder).toBe('function');
    expect(typeof result.current.deleteNode).toBe('function');
  });
});
