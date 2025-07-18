import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import * as matchers from '@testing-library/jest-dom/matchers';
import RegisterForm from '../RegisterForm';

expect.extend(matchers);

// Mock the auth context
const mockRegister = vi.fn();
const mockAuthContext = {
  user: null,
  token: null,
  login: vi.fn(),
  register: mockRegister,
  logout: vi.fn(),
  isLoading: false,
  isAuthenticated: false,
};

vi.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthContext,
}));

const renderRegisterForm = (props = {}) => {
  return render(
    <BrowserRouter>
      <RegisterForm {...props} />
    </BrowserRouter>
  );
};

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders registration form with all required fields', () => {
    renderRegisterForm();
    
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
    expect(screen.getByText('Join March Madness Squares today')).toBeInTheDocument();
    expect(screen.getByLabelText('Display Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
  });

  it('calls register function with correct data', async () => {
    const user = userEvent.setup();
    renderRegisterForm();
    
    const displayNameInput = screen.getByLabelText('Display Name');
    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Create Account' });
    
    await user.type(displayNameInput, 'John Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(passwordInput, 'Password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        displayName: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
      });
    });
  });

  it('displays server error when registration fails', async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            message: 'Email already exists',
          },
        },
      },
    });
    
    renderRegisterForm();
    
    const displayNameInput = screen.getByLabelText('Display Name');
    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Create Account' });
    
    await user.type(displayNameInput, 'John Doe');
    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'Password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });
  });

  it('calls onSwitchToLogin when login link is clicked', async () => {
    const user = userEvent.setup();
    const mockSwitchToLogin = vi.fn();
    renderRegisterForm({ onSwitchToLogin: mockSwitchToLogin });
    
    const loginLink = screen.getByText('Sign in here');
    await user.click(loginLink);
    
    expect(mockSwitchToLogin).toHaveBeenCalled();
  });

  it('shows password requirements hint', () => {
    renderRegisterForm();
    
    expect(screen.getByText('Password must contain at least one uppercase letter, one lowercase letter, and one number')).toBeInTheDocument();
  });
});