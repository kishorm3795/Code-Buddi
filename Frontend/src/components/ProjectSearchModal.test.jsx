import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectSearchModal from './ProjectSearchModal';

describe('ProjectSearchModal', () => {
  const mockFiles = [
    { id: '1', name: 'main.py', path: 'main.py', type: 'file' },
    { id: '2', name: 'utils.py', path: 'src/utils.py', type: 'file' },
    { id: '3', name: 'styles.css', path: 'src/styles.css', type: 'file' },
  ];

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ProjectSearchModal isOpen={false} onClose={vi.fn()} files={mockFiles} onSelectFile={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog and search input when isOpen is true', () => {
    render(
      <ProjectSearchModal isOpen={true} onClose={vi.fn()} files={mockFiles} onSelectFile={vi.fn()} />
    );
    expect(screen.getByRole('dialog', { name: /quick file search/i })).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('filters file list as user types in searchbox', () => {
    render(
      <ProjectSearchModal isOpen={true} onClose={vi.fn()} files={mockFiles} onSelectFile={vi.fn()} />
    );
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'utils' } });

    expect(screen.getByText('utils.py')).toBeInTheDocument();
    expect(screen.queryByText('styles.css')).not.toBeInTheDocument();
  });

  it('calls onSelectFile and onClose when user clicks a search result', () => {
    const onSelectFile = vi.fn();
    const onClose = vi.fn();

    render(
      <ProjectSearchModal isOpen={true} onClose={onClose} files={mockFiles} onSelectFile={onSelectFile} />
    );

    const fileItem = screen.getAllByText('main.py')[0];
    fireEvent.click(fileItem);

    expect(onSelectFile).toHaveBeenCalledWith(expect.objectContaining({ name: 'main.py' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <ProjectSearchModal isOpen={true} onClose={onClose} files={mockFiles} onSelectFile={vi.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: /close search/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
