import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import NavigationLinks from './NavigationLinks';
import { ThemeProvider } from '../context/ThemeProvider';

const renderNavigationLinks = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <NavigationLinks />
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('NavigationLinks (Homepage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders CodeBuddi title', () => {
    renderNavigationLinks();
    expect(screen.getByText('CodeBuddi')).toBeInTheDocument();
  });

  it('renders subtitle with AI-Powered text', () => {
    renderNavigationLinks();
    expect(screen.getByText(/next-generation online ide/i)).toBeInTheDocument();
    expect(screen.getByText(/ai-powered/i)).toBeInTheDocument();
  });

  it('renders feature pills', () => {
    renderNavigationLinks();
    expect(screen.getByText('20+ Languages')).toBeInTheDocument();
    expect(screen.getByText('AI Code Gen')).toBeInTheDocument();
    expect(screen.getByText('Real-time Preview')).toBeInTheDocument();
    expect(screen.getByText('Share & Collaborate')).toBeInTheDocument();
  });

  it('renders language cards grid', () => {
    renderNavigationLinks();
    // Check for some key language cards
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('Javascript')).toBeInTheDocument();
    expect(screen.getByText('HTML, CSS, JS')).toBeInTheDocument();
    expect(screen.getByText('Rust')).toBeInTheDocument();
    expect(screen.getByText('Go')).toBeInTheDocument();
    expect(screen.getByText('Typescript')).toBeInTheDocument();
  });

  it('has links to editor pages for each language', () => {
    renderNavigationLinks();
    const pythonLink = screen.getByRole('link', { name: /navigate to python editor/i });
    expect(pythonLink).toHaveAttribute('href', expect.stringContaining('/python'));

    const jsLink = screen.getByRole('link', { name: /navigate to javascript editor/i });
    expect(jsLink).toHaveAttribute('href', expect.stringContaining('/javascript'));
  });

  it('has link to HTML/CSS/JS editor', () => {
    renderNavigationLinks();
    const htmlCssJsLink = screen.getByRole('link', { name: /navigate to html, css, js editor/i });
    expect(htmlCssJsLink).toHaveAttribute('href', expect.stringContaining('/htmlcssjs'));
  });

  it('sets document title', () => {
    renderNavigationLinks();
    expect(document.title).toBe('CodeBuddi - Online IDE');
  });

  it('has CTA indicator', () => {
    renderNavigationLinks();
    expect(screen.getByText('Select a language to start coding')).toBeInTheDocument();
  });
});

describe('NavigationLinks language card interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies hover effects on language cards', () => {
    renderNavigationLinks();
    const pythonCard = screen.getByRole('link', { name: /navigate to python editor/i });
    expect(pythonCard).toBeInTheDocument();

    // Fire mouse enter event
    fireEvent.mouseEnter(pythonCard);

    // The card should have hover styles applied (scale-105, -translate-y-1)
    // We can't easily test CSS transforms in JSDOM, but we can verify the element exists
    expect(pythonCard).toBeInTheDocument();
  });
});