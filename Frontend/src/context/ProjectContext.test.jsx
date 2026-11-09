import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ProjectProvider, useProject } from './ProjectContext';

describe('ProjectContext state management', () => {
  let mockStorage = {};

  beforeEach(() => {
    mockStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => mockStorage[key] || null),
      setItem: vi.fn((key, val) => {
        mockStorage[key] = String(val);
      }),
      removeItem: vi.fn((key) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        mockStorage = {};
      }),
    });
  });

  const wrapper = ({ children }) => <ProjectProvider>{children}</ProjectProvider>;

  it('initializes with empty or loaded projects', () => {
    const { result } = renderHook(() => useProject(), { wrapper });
    expect(result.current.projects).toEqual([]);
    expect(result.current.currentProject).toBeNull();
  });

  it('creates and opens a new project', () => {
    const { result } = renderHook(() => useProject(), { wrapper });

    act(() => {
      result.current.newProject('Test Project', 'blank');
    });

    expect(result.current.projects.length).toBe(1);
    expect(result.current.projects[0].name).toBe('Test Project');
    expect(result.current.currentProject).toBeDefined();
    expect(result.current.currentProject.name).toBe('Test Project');
  });

  it('creates file within the current project tree', () => {
    const { result } = renderHook(() => useProject(), { wrapper });

    act(() => {
      result.current.newProject('App Repo', 'blank');
    });

    act(() => {
      result.current.createFile('index.js', null, 'console.log("hi");');
    });

    const currentFiles = result.current.currentProject.files;
    const created = currentFiles.find((f) => f.name === 'index.js');
    expect(created).toBeDefined();
    expect(created.type).toBe('file');
    expect(created.content).toBe('console.log("hi");');
  });

  it('creates folder and supports closing project', () => {
    const { result } = renderHook(() => useProject(), { wrapper });

    act(() => {
      result.current.newProject('Folder Test', 'blank');
    });

    act(() => {
      result.current.createFolder('components', null);
    });

    const folder = result.current.currentProject.files.find((f) => f.name === 'components');
    expect(folder).toBeDefined();
    expect(folder.type).toBe('folder');

    act(() => {
      result.current.closeProject();
    });

    expect(result.current.currentProject).toBeNull();
    expect(result.current.currentProjectId).toBeNull();
  });

  it('deletes project via removeProject', () => {
    const { result } = renderHook(() => useProject(), { wrapper });

    let proj;
    act(() => {
      proj = result.current.newProject('To Remove', 'blank');
    });

    expect(result.current.projects.length).toBe(1);

    act(() => {
      result.current.removeProject(proj.id);
    });

    expect(result.current.projects.length).toBe(0);
    expect(result.current.currentProject).toBeNull();
  });
});
