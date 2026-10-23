import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Footer from './Footer';

describe('Footer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders copyright with current year', () => {
    const currentYear = new Date().getFullYear();
    render(<Footer />);
    expect(screen.getByText(`© ${currentYear}`)).toBeInTheDocument();
  });

  it('renders CodeBuddi branding', () => {
    render(<Footer />);
    expect(screen.getByText('CodeBuddi')).toBeInTheDocument();
  });

  it('renders powered by AI text', () => {
    render(<Footer />);
    expect(screen.getByText('Powered by AI')).toBeInTheDocument();
  });

  it('renders technology tags (HTML, CSS, JavaScript)', () => {
    render(<Footer />);
    expect(screen.getByText('HTML')).toBeInTheDocument();
    expect(screen.getByText('CSS')).toBeInTheDocument();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
  });

  it('has proper footer styling classes', () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector('footer');
    expect(footer).toHaveClass('bg-white');
    expect(footer).toHaveClass('dark:bg-gray-900');
    expect(footer).toHaveClass('border-t');
    expect(footer).toHaveClass('border-gray-200');
    expect(footer).toHaveClass('dark:border-gray-800');
  });
});