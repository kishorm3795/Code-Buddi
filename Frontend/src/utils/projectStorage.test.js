import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateId,
  nowISO,
  createFileNode,
  createFolderNode,
  getLanguageFromExtension,
  getTemplates,
  getTemplate,
  createProjectFromTemplate,
  loadProjects,
  saveProject,
  getProject,
  deleteProject,
} from './projectStorage.js';

describe('projectStorage - Core CRUD & Templates', () => {
  let mockStore = {};

  beforeEach(() => {
    mockStore = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => mockStore[key] || null),
      setItem: vi.fn((key, value) => {
        mockStore[key] = String(value);
      }),
      removeItem: vi.fn((key) => {
        delete mockStore[key];
      }),
      clear: vi.fn(() => {
        mockStore = {};
      }),
    });
  });

  describe('Utility & Node Creation', () => {
    it('generates a valid v4 UUID-like string', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('returns ISO string timestamp with nowISO', () => {
      const iso = nowISO();
      expect(new Date(iso).toISOString()).toBe(iso);
    });

    it('creates file node with defaults and detects language', () => {
      const file = createFileNode('main.py', 'root', 'print("hello")');
      expect(file.type).toBe('file');
      expect(file.name).toBe('main.py');
      expect(file.language).toBe('python');
      expect(file.content).toBe('print("hello")');
      expect(file.parentId).toBe('root');
      expect(file.isDirty).toBe(false);
    });

    it('creates folder node with empty children array', () => {
      const folder = createFolderNode('src', null);
      expect(folder.type).toBe('folder');
      expect(folder.name).toBe('src');
      expect(folder.children).toEqual([]);
      expect(folder.parentId).toBeNull();
    });

    it('maps extensions to correct language ids', () => {
      expect(getLanguageFromExtension('app.jsx')).toBe('javascript');
      expect(getLanguageFromExtension('main.rs')).toBe('rust');
      expect(getLanguageFromExtension('script.py')).toBe('python');
      expect(getLanguageFromExtension('index.ts')).toBe('typescript');
      expect(getLanguageFromExtension('main.go')).toBe('go');
      expect(getLanguageFromExtension('unknown.xyz')).toBe('plaintext');
    });
  });

  describe('Templates', () => {
    it('returns all pre-configured project templates', () => {
      const templates = getTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(6);
      const ids = templates.map((t) => t.id);
      expect(ids).toContain('blank');
      expect(ids).toContain('react');
      expect(ids).toContain('python');
    });

    it('retrieves specific template by id', () => {
      const t = getTemplate('python');
      expect(t).toBeDefined();
      expect(t.name).toContain('Python');
    });

    it('creates project initialized from template', () => {
      const project = createProjectFromTemplate('python', 'My Python Project');
      expect(project.name).toBe('My Python Project');
      expect(project.template).toBe('python');
      expect(project.files).toBeDefined();
      expect(project.activeFileId).toBeDefined();
    });
  });

  describe('Storage CRUD', () => {
    it('returns empty array when no projects are saved', () => {
      expect(loadProjects()).toEqual([]);
    });

    it('saves and retrieves a project', () => {
      const project = createProjectFromTemplate('blank', 'Demo');
      const saveRes = saveProject(project);
      expect(saveRes.success).toBe(true);

      const loaded = getProject(project.id);
      expect(loaded).toBeDefined();
      expect(loaded.name).toBe('Demo');
    });

    it('deletes an existing project', () => {
      const project = createProjectFromTemplate('blank', 'To Delete');
      saveProject(project);
      expect(getProject(project.id)).toBeDefined();

      const delRes = deleteProject(project.id);
      expect(delRes.success).toBe(true);
      expect(getProject(project.id)).toBeNull();
    });
  });
});
