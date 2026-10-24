import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';
import { ThemeProvider } from '../context/ThemeProvider';

// Mock GoogleLogin component
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess, onError, ...props }) => (
    <button
      data-testid="google-login-button"
      onClick={() => onSuccess({ credential: 'mock-credential' })}
      {...props}
    >
      Continue with Google
    </button>
  ),
}));

// Mock apiClient - must be at top level for hoisting
vi.mock('../api/client', () => {
  const fn = vi.fn();
  return {
    apiClient: fn,
    apiFetch: fn,
    default: fn,
  };
});

import { apiClient } from '../api/client';
const apiFetch = apiClient;

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <Login />
      </ThemeProvider>
    </BrowserRouter>
  );
};

// Helper to get the form element
const getLoginForm = () => {
  const submitButton = screen.getByRole('button', { name: /sign in/i });
  return submitButton.form || document.querySelector('form');
};

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders login form with email and password fields', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation error for invalid email', async () => {
    renderLogin();
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const form = getLoginForm();

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('⚠ Invalid email format')).toBeInTheDocument();
    });
  });

  it('shows validation error for short password', async () => {
    renderLogin();
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const form = getLoginForm();

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('⚠ Password must be at least 8 characters long')).toBeInTheDocument();
    });
  });

  it('toggles password visibility', () => {
    renderLogin();
    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Click the toggle button - it shows "Show" when password is hidden
    const toggleButton = screen.getByRole('button', { name: /show/i });
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');

    // Now it should show "Hide"
    const hideButton = screen.getByRole('button', { name: /hide/i });
    fireEvent.click(hideButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('has button to navigate to register page', () => {
    renderLogin();
    // "Sign up" is a button, not a link
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('has button to navigate to forgot password page', () => {
    renderLogin();
    // "Forgot password?" is a button, not a link
    expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument();
  });

  it('has Google login button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('sets document title', () => {
    renderLogin();
    expect(document.title).toBe('Login - CodeBuddi');
  });
});

describe('Login form submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls apiFetch on valid form submission', async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'test-token', username: 'testuser', isgoogleuser: 'false' }),
    });

    renderLogin();

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const form = getLoginForm();

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalled();
    });
  });

  it('displays friendly error message on 429 rate limit response', async () => {
    apiClient.mockResolvedValue({
      ok: false,
      status: 429,
      errorMessage: 'Too many requests, please try again after 15 minutes',
      json: () => Promise.resolve({ msg: 'Too many requests, please try again after 15 minutes' }),
    });

    renderLogin();

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const form = getLoginForm();

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText('⚠ Too many requests, please try again after 15 minutes')
      ).toBeInTheDocument();
    });
  });
});