import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProjectDashboard from './ProjectDashboard';
import * as ProjectHookModule from '../hooks/useProject';

describe('ProjectDashboard Component', () => {
  let mockContext;

  beforeEach(() => {
    mockContext = {
      projects: [
        {
          id: 'p-1',
          name: 'Cyberpunk React',
          template: 'react',
          files: [{ id: 'f1', name: 'App.jsx', type: 'file' }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'p-2',
          name: 'Python Microservice',
          template: 'python',
          files: [{ id: 'f2', name: 'main.py', type: 'file' }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      openProject: vi.fn(),
      removeProject: vi.fn(),
      copyProject: vi.fn(),
      downloadProject: vi.fn(),
      importProjectFile: vi.fn(),
      newProject: vi.fn(),
    };

    vi.spyOn(ProjectHookModule, 'useProject').mockReturnValue(mockContext);
  });

  const renderDashboard = () =>
    render(
      <BrowserRouter>
        <ProjectDashboard />
      </BrowserRouter>
    );

  it('renders dashboard with project cards', () => {
    renderDashboard();

    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Cyberpunk React')).toBeInTheDocument();
    expect(screen.getByText('Python Microservice')).toBeInTheDocument();
  });

  it('filters project list by search input', () => {
    renderDashboard();

    const searchInput = screen.getByPlaceholderText(/search projects/i);
    fireEvent.change(searchInput, { target: { value: 'Cyberpunk' } });

    expect(screen.getByText('Cyberpunk React')).toBeInTheDocument();
    expect(screen.queryByText('Python Microservice')).not.toBeInTheDocument();
  });

  it('opens NewProjectModal when New Project button is clicked', () => {
    renderDashboard();

    const newBtn = screen.getByRole('button', { name: /new project/i });
    fireEvent.click(newBtn);

    expect(screen.getByText('Create New Project')).toBeInTheDocument();
  });

  it('shows empty state when no projects exist', () => {
    mockContext.projects = [];
    renderDashboard();

    expect(screen.getByText('No projects found')).toBeInTheDocument();
  });
});
