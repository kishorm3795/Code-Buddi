import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NewProjectModal from './NewProjectModal';

describe('NewProjectModal Component', () => {
  it('renders template options on step 1', () => {
    render(<NewProjectModal onClose={vi.fn()} onCreate={vi.fn()} />);

    expect(screen.getByText('Create New Project')).toBeInTheDocument();
    expect(screen.getByText('React + Vite')).toBeInTheDocument();
    expect(screen.getAllByText('Python')[0]).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
  });

  it('navigates to step 2 when a template is selected and validates required name', () => {
    const onCreate = vi.fn();
    render(<NewProjectModal onClose={vi.fn()} onCreate={onCreate} />);

    // Select Python template
    fireEvent.click(screen.getByText('Python project with main.py'));

    // Step 2 header
    expect(screen.getByText('Configure Project')).toBeInTheDocument();

    // Attempt to submit empty name
    const createBtn = screen.getByRole('button', { name: /create project/i });
    fireEvent.click(createBtn);

    expect(screen.getByText('Project name is required')).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('submits valid project name and template info to onCreate', () => {
    const onCreate = vi.fn();
    render(<NewProjectModal onClose={vi.fn()} onCreate={onCreate} />);

    // Select Python template
    fireEvent.click(screen.getByText('Python project with main.py'));

    // Fill valid name
    const input = screen.getByPlaceholderText('e.g., my-awesome-project');
    fireEvent.change(input, { target: { value: 'CodeBuddi ML' } });

    const createBtn = screen.getByRole('button', { name: /create project/i });
    fireEvent.click(createBtn);

    expect(onCreate).toHaveBeenCalledWith('CodeBuddi ML', 'python', 'python');
  });

  it('calls onClose when close icon is clicked', () => {
    const onClose = vi.fn();
    render(<NewProjectModal onClose={onClose} onCreate={vi.fn()} />);

    const closeBtn = screen.getByLabelText('Close modal');
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalled();
  });
});
