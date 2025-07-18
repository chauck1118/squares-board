import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as matchers from '@testing-library/jest-dom/matchers';
import AuthGuard from '../AuthGuard';

expect.extend(matchers);

// Mock the auth context
let mockAuthContext = {
  user: null,
  token: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  isLoading: false,
  isAuthenticated: false,
};

vi.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthContext,
}));

const TestComponent = () => <div>Protected Content</div>;

const renderAuthGuard = (props = {}, initialEntries = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthGuard {...props}>
        <TestComponent />
      </AuthGuard>
    </MemoryRouter>
  );
};

describe('AuthGuard', () => {
  beforeEach(() => {
    mockAuthContext = {
      user: null,
      token: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
      isAuthenticated: false,
    };
  });

  it('shows loading spinner when authentication is loading', () => {
    mockAuthContext.isLoading = true;
    renderAuthGuard();
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders protected content when user is authenticated', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = {
      id: '1',
      email: 'test@example.com',
      displayName: 'Test User',
      isAdmin: false,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    };
    
    renderAuthGuard({ requireAuth: true });
    
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders content for unauthenticated users on public pages', () => {
    mockAuthContext.isAuthenticated = false;
    
    renderAuthGuard({ requireAuth: false });
    
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows access denied for non-admin users on admin pages', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = {
      id: '1',
      email: 'test@example.com',
      displayName: 'Test User',
      isAdmin: false,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    };
    
    renderAuthGuard({ requireAuth: true, requireAdmin: true });
    
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText("You don't have permission to access this page.")).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders admin content for admin users', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = {
      id: '1',
      email: 'admin@example.com',
      displayName: 'Admin User',
      isAdmin: true,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    };
    
    renderAuthGuard({ requireAuth: true, requireAdmin: true });
    
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});