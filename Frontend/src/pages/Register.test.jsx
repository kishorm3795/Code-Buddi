import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Register from './Register';
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

// Mock OtpInputForm component
vi.mock('../utils/OtpInputForm', () => ({
  default: ({ onOtpChange }) => (
    <div data-testid="otp-input-form">
      <input
        type="text"
        placeholder="Enter OTP"
        onChange={(e) => onOtpChange(e.target.value)}
        data-testid="otp-input"
      />
    </div>
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

const renderRegister = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <Register />
      </ThemeProvider>
    </BrowserRouter>
  );
};

// Helper to get the form element
const getRegisterForm = () => {
  const submitButton = screen.getByRole('button', { name: /register/i });
  return submitButton.form || document.querySelector('form');
};

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders registration form with username, email, and password fields', () => {
    renderRegister();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  it('sets document title', () => {
    renderRegister();
    expect(document.title).toBe('Register - CodeBuddi');
  });

  it('shows validation error for invalid email', async () => {
    renderRegister();
    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const form = getRegisterForm();

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('⚠ Invalid email format')).toBeInTheDocument();
    });
  });

  it('shows validation error for short username (fails regex)', async () => {
    renderRegister();
    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const form = getRegisterForm();

    // "ab" fails USERNAME_REGEX which requires 5-30 chars
    fireEvent.change(usernameInput, { target: { value: 'ab' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('⚠ Username can only contain letters, numbers, underscores, hyphens, and periods (5-30 characters).')).toBeInTheDocument();
    });
  });

  it('shows validation error for reserved username', async () => {
    renderRegister();
    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const form = getRegisterForm();

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('⚠ This username is reserved. Please choose another one.')).toBeInTheDocument();
    });
  });

  it('shows validation error for short password', async () => {
    renderRegister();
    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const form = getRegisterForm();

    fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('⚠ Password must be at least 8 characters long')).toBeInTheDocument();
    });
  });

  it('toggles password visibility', () => {
    renderRegister();
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

  it('has link to login page', () => {
    renderRegister();
    expect(screen.getByRole('button', { name: /login here/i })).toBeInTheDocument();
  });

  it('has Google login button', () => {
    renderRegister();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });
});

describe('Register OTP flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows OTP input and remaining attempts after registration', async () => {
    apiFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ msg: 'Email not verified.' }),
    });

    renderRegister();
    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const form = getRegisterForm();

    fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Verify Email')).toBeInTheDocument();
      expect(screen.getByText(/Remaining attempts:/i)).toBeInTheDocument();
      expect(screen.getByText(/5 of 5/i)).toBeInTheDocument();
    });
  });

  it('decrements remaining OTP attempts on failed verification', async () => {
    apiFetch
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ msg: 'Email not verified.' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ msg: 'Invalid OTP' }),
      });

    renderRegister();
    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const form = getRegisterForm();

    fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Verify Email')).toBeInTheDocument();
    });

    const otpInput = screen.getByTestId('otp-input');
    fireEvent.change(otpInput, { target: { value: '000000' } });

    const verifyButton = screen.getByRole('button', { name: /verify otp/i });
    fireEvent.click(verifyButton);

    await waitFor(() => {
      expect(screen.getByText(/4 of 5/i)).toBeInTheDocument();
      expect(screen.getByText(/4 attempts remaining/i)).toBeInTheDocument();
    });
  });

  it('displays rate limit friendly message on 429 response', async () => {
    apiFetch.mockResolvedValue({
      ok: false,
      status: 429,
      errorMessage: 'Too many requests. Please wait a few minutes before trying again.',
      json: () => Promise.resolve({ msg: 'Too many requests. Please wait a few minutes before trying again.' }),
    });

    renderRegister();
    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const form = getRegisterForm();

    fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/Too many requests/i)).toBeInTheDocument();
    });
  });
});

describe('Register form submission', () => {
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
      ok: false,
      json: () => Promise.resolve({ msg: 'Email not verified.' }),
    });

    renderRegister();

    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const form = getRegisterForm();

    fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalled();
    });
  });
});