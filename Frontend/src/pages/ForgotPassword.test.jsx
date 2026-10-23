import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ForgotPassword from './ForgotPassword';
import { ThemeProvider } from '../context/ThemeProvider';

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

// Mock apiFetch - must be at top level for hoisting
vi.mock('../utils/apifetch', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../utils/apifetch';

const renderForgotPassword = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <ForgotPassword />
      </ThemeProvider>
    </BrowserRouter>
  );
};

// Helper to get the form element
const getForm = () => {
  const submitButton = screen.getByRole('button', { name: /send otp|verify otp|reset password/i });
  return submitButton.form || document.querySelector('form');
};

describe('ForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders email input form initially', () => {
    renderForgotPassword();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send otp/i })).toBeInTheDocument();
    expect(screen.getByText('Forgot Password')).toBeInTheDocument();
  });

  it('sets document title to "Forgot Password" initially', () => {
    renderForgotPassword();
    expect(document.title).toBe('Forgot Password');
  });

  it('shows error for empty email', async () => {
    renderForgotPassword();
    const form = getForm();
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Please enter your email.')).toBeInTheDocument();
    });
  });

  it('shows error for invalid email format', async () => {
    renderForgotPassword();
    const emailInput = screen.getByLabelText(/email/i);
    const form = getForm();

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });
  });

  it('shows error when email not found', async () => {
    apiFetch
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ msg: 'Email not found.' }) });

    renderForgotPassword();
    const emailInput = screen.getByLabelText(/email/i);
    const form = getForm();

    fireEvent.change(emailInput, { target: { value: 'notfound@example.com' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Email not found.')).toBeInTheDocument();
    });
  });

  it('shows OTP verification form after successful email submission', async () => {
    apiFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    renderForgotPassword();
    const emailInput = screen.getByLabelText(/email/i);
    const form = getForm();

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('OTP Verification')).toBeInTheDocument();
    });

    // OTP input form should be visible
    expect(screen.getByPlaceholderText(/enter otp/i)).toBeInTheDocument();
  });

  it('sets document title to "OTP Verification" after email verified', async () => {
    apiFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    renderForgotPassword();
    const emailInput = screen.getByLabelText(/email/i);
    const form = getForm();

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(document.title).toBe('OTP Verification');
    });
  });

  it('shows error for empty OTP', async () => {
    apiFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    renderForgotPassword();
    const emailInput = screen.getByLabelText(/email/i);
    const form = getForm();

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.submit(form);

    // Now we're on OTP verification step
    await waitFor(() => {
      const otpForm = screen.getByRole('button', { name: /verify otp/i }).form || document.querySelector('form');
      fireEvent.submit(otpForm);
    });

    await waitFor(() => {
      expect(screen.getByText('Please enter the OTP.')).toBeInTheDocument();
    });
  });

  it('shows "Set New Password" form after OTP verification', async () => {
    apiFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    renderForgotPassword();
    const emailInput = screen.getByLabelText(/email/i);
    const form = getForm();

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.submit(form);

    // Enter OTP and submit
    await waitFor(() => {
      const otpInput = screen.getByPlaceholderText(/enter otp/i);
      fireEvent.change(otpInput, { target: { value: '123456' } });
      const otpForm = screen.getByRole('button', { name: /verify otp/i }).form || document.querySelector('form');
      fireEvent.submit(otpForm);
    });

    await waitFor(() => {
      expect(screen.getByText('Set New Password')).toBeInTheDocument();
    });

    // New password and confirm password fields should be visible
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('sets document title to "Set New Password" after OTP verified', async () => {
    apiFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    renderForgotPassword();
    const emailInput = screen.getByLabelText(/email/i);
    const form = getForm();

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.submit(form);

    await waitFor(() => {
      const otpInput = screen.getByPlaceholderText(/enter otp/i);
      fireEvent.change(otpInput, { target: { value: '123456' } });
      const otpForm = screen.getByRole('button', { name: /verify otp/i }).form || document.querySelector('form');
      fireEvent.submit(otpForm);
    });

    await waitFor(() => {
      expect(document.title).toBe('Set New Password');
    });
  });

  it('shows error when passwords do not match', async () => {
    apiFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    renderForgotPassword();
    const emailInput = screen.getByLabelText(/email/i);
    const form = getForm();

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.submit(form);

    await waitFor(() => {
      const otpInput = screen.getByPlaceholderText(/enter otp/i);
      fireEvent.change(otpInput, { target: { value: '123456' } });
      const otpForm = screen.getByRole('button', { name: /verify otp/i }).form || document.querySelector('form');
      fireEvent.submit(otpForm);
    });

    // Now on Set New Password step
    await waitFor(() => {
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const passwordForm = screen.getByRole('button', { name: /reset password/i }).form || document.querySelector('form');

      fireEvent.change(newPasswordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });
      fireEvent.submit(passwordForm);
    });

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    });
  });

  it('shows error for short password', async () => {
    apiFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    renderForgotPassword();
    const emailInput = screen.getByLabelText(/email/i);
    const form = getForm();

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.submit(form);

    await waitFor(() => {
      const otpInput = screen.getByPlaceholderText(/enter otp/i);
      fireEvent.change(otpInput, { target: { value: '123456' } });
      const otpForm = screen.getByRole('button', { name: /verify otp/i }).form || document.querySelector('form');
      fireEvent.submit(otpForm);
    });

    await waitFor(() => {
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const passwordForm = screen.getByRole('button', { name: /reset password/i }).form || document.querySelector('form');

      fireEvent.change(newPasswordInput, { target: { value: 'short' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'short' } });
      fireEvent.submit(passwordForm);
    });

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters long.')).toBeInTheDocument();
    });
  });

  it('has Login link when not logged in', () => {
    renderForgotPassword();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });
});