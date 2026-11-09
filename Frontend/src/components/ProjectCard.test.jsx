import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectCard from './ProjectCard';

describe('ProjectCard Component', () => {
  const mockProject = {
    id: 'proj-123',
    name: 'Sample React App',
    template: 'react',
    files: [
      { id: '1', name: 'App.jsx', type: 'file' },
      { id: '2', name: 'index.html', type: 'file' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('renders project name and file count badge', () => {
    render(
      <ProjectCard
        project={mockProject}
        onOpen={vi.fn()}
        onDuplicate={vi.fn()}
        onDownload={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Sample React App')).toBeInTheDocument();
    expect(screen.getByText('2 files')).toBeInTheDocument();
  });

  it('invokes onOpen callback when Open Project button is clicked', () => {
    const onOpen = vi.fn();
    render(
      <ProjectCard
        project={mockProject}
        onOpen={onOpen}
        onDuplicate={vi.fn()}
        onDownload={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const openBtn = screen.getByRole('button', { name: /open project/i });
    fireEvent.click(openBtn);

    expect(onOpen).toHaveBeenCalledWith('proj-123');
  });

  it('triggers onDelete when delete button is confirmed', () => {
    const onDelete = vi.fn();
    render(
      <ProjectCard
        project={mockProject}
        onOpen={vi.fn()}
        onDuplicate={vi.fn()}
        onDownload={vi.fn()}
        onDelete={onDelete}
      />
    );

    // Open dropdown menu
    const menuBtn = screen.getByLabelText('Project options');
    fireEvent.click(menuBtn);

    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteBtn);

    expect(onDelete).toHaveBeenCalledWith('proj-123');
  });
});
