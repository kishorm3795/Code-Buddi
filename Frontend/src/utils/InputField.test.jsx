import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InputField from './InputField';

describe('InputField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders label with required asterisk', () => {
    render(<InputField label="Email" name="email" value="" onChange={vi.fn()} required />);
    expect(screen.getByLabelText('Email *')).toBeInTheDocument();
  });

  it('renders input with correct props when type is provided', () => {
    const onChange = vi.fn();
    render(<InputField label="Username" name="username" value="test" onChange={onChange} type="text" />);

    const input = screen.getByLabelText('Username *');
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('name', 'username');
    expect(input).toHaveAttribute('id', 'username');
    expect(input).toHaveValue('test');
    expect(input).toHaveAttribute('autocomplete', 'username');
    expect(input).not.toBeDisabled();
  });

  it('renders password input with correct autocomplete when type is provided', () => {
    render(<InputField label="Password" name="password" value="" onChange={vi.fn()} required type="password" />);
    const input = screen.getByLabelText('Password *');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('autocomplete', 'current-password');
  });

  it('renders new password input with correct autocomplete', () => {
    render(<InputField label="New Password" name="newPassword" value="" onChange={vi.fn()} required type="password" />);
    const input = screen.getByLabelText('New Password *');
    expect(input).toHaveAttribute('autocomplete', 'new-password');
  });

  it('renders confirm password input with correct autocomplete', () => {
    render(<InputField label="Confirm Password" name="confirmPassword" value="" onChange={vi.fn()} required type="password" />);
    const input = screen.getByLabelText('Confirm Password *');
    expect(input).toHaveAttribute('autocomplete', 'new-password');
  });

  it('renders non-password input with autocomplete off', () => {
    render(<InputField label="Custom" name="custom" value="" onChange={vi.fn()} type="text" />);
    const input = screen.getByLabelText('Custom *');
    expect(input).toHaveAttribute('autocomplete', 'off');
  });

  it('calls onChange when input changes', () => {
    const onChange = vi.fn();
    render(<InputField label="Email" name="email" value="" onChange={onChange} type="email" />);

    const input = screen.getByLabelText('Email *');
    fireEvent.change(input, { target: { value: 'test@example.com' } });

    expect(onChange).toHaveBeenCalled();
    // The event is a SyntheticEvent, we just verify it was called
    expect(onChange.mock.calls[0][0]).toBeDefined();
  });

  it('shows password toggle button for password fields', () => {
    const onTogglePassword = vi.fn();
    render(<InputField label="Password" name="password" value="" onChange={vi.fn()} showPassword={false} onTogglePassword={onTogglePassword} type="password" />);

    const toggleButton = screen.getByRole('button', { name: /show/i });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveTextContent('Show');
  });

  it('shows "Hide" when showPassword is true', () => {
    const onTogglePassword = vi.fn();
    render(<InputField label="Password" name="password" value="" onChange={vi.fn()} showPassword={true} onTogglePassword={onTogglePassword} type="password" />);

    const toggleButton = screen.getByRole('button', { name: /hide/i });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveTextContent('Hide');
  });

  it('calls onTogglePassword when button is clicked', () => {
    const onTogglePassword = vi.fn();
    render(<InputField label="Password" name="password" value="" onChange={vi.fn()} showPassword={false} onTogglePassword={onTogglePassword} type="password" />);

    const toggleButton = screen.getByRole('button', { name: /show/i });
    fireEvent.click(toggleButton);

    expect(onTogglePassword).toHaveBeenCalled();
  });

  it('disables input and toggle button when disabled', () => {
    render(<InputField label="Email" name="email" value="test" onChange={vi.fn()} disabled type="text" />);

    const input = screen.getByLabelText('Email *');
    expect(input).toBeDisabled();

    // Test password field with disabled
    const { unmount } = render(<InputField label="Password" name="password" value="" onChange={vi.fn()} showPassword={false} onTogglePassword={vi.fn()} disabled type="password" />);
    const passwordInput = screen.getByLabelText('Password *');
    expect(passwordInput).toBeDisabled();

    const toggleButton = screen.getByRole('button', { name: /show/i });
    expect(toggleButton).toBeDisabled();
  });

  it('renders with correct CSS classes', () => {
    const { container } = render(<InputField label="Email" name="email" value="" onChange={vi.fn()} type="email" />);
    const input = container.querySelector('input');
    expect(input).toHaveClass('w-full');
    expect(input).toHaveClass('p-3');
    expect(input).toHaveClass('rounded-md');
  });
});