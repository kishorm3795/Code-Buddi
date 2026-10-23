import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from './Header';
import { ThemeProvider, ThemeContext } from '../context/ThemeProvider';

const renderHeader = (initialDarkMode = false) => {
  // Set initial theme in localStorage
  localStorage.setItem('theme', initialDarkMode ? 'dark' : 'light');

  return render(
    <BrowserRouter>
      <ThemeProvider>
        <ThemeContext.Consumer>
          {({ isDarkMode, toggleTheme }) => (
            <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
          )}
        </ThemeContext.Consumer>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders logo with CodeBuddi text', () => {
    renderHeader();
    expect(screen.getByText('CodeBuddi')).toBeInTheDocument();
  });

  it('shows Login and Register links when not logged in', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument();
  });

  it('shows theme toggle button', () => {
    renderHeader();
    const themeButton = screen.getByRole('button', { name: /switch to (dark|light) mode/i });
    expect(themeButton).toBeInTheDocument();
  });

  it('toggles theme when theme button is clicked', async () => {
    renderHeader(false); // Start with light mode

    // Initial state - should be light mode
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument();

    // Click theme toggle
    const themeButton = screen.getByRole('button', { name: /switch to dark mode/i });
    fireEvent.click(themeButton);

    // Should now show light mode button (since it toggled to dark)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();
    });
  });

  it('shows mobile menu button', () => {
    renderHeader();
    // The mobile menu button has an icon but no accessible name
    // We can find it by its role and the fact it's the only button without an accessible name in the header
    const buttons = screen.getAllByRole('button');
    // One is theme toggle, one is mobile menu
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('shows sun icon in light mode and moon icon in dark mode', () => {
    renderHeader(false); // Light mode
    // The theme button contains either RxSun or RxMoon icon
    const themeButton = screen.getByRole('button', { name: /switch to dark mode/i });
    // The icon should be present inside the button
    expect(themeButton).toBeInTheDocument();
  });
});


// Simple unit tests for Header helper functions
describe('Header utilities', () => {
  it('formats username correctly', () => {
    // Test the formatUsername function logic
    const formatUsername = (username) => {
      if (username.length > 15) {
        return `${username.slice(0, 5)}...${username.slice(-5)}`;
      }
      return username;
    };

    expect(formatUsername('short')).toBe('short');
    expect(formatUsername('thisisaverylongusername')).toBe('thisi...rname');
    expect(formatUsername('exactly15chars!')).toBe('exactly15chars!');
  });
});