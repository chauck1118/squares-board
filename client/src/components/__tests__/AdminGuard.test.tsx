import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import AdminGuard from '../AdminGuard';
import { User } from '../../types/auth';

import { vi } from 'vitest';

// Mock the API service
vi.mock('../../services/api', () => ({
  apiService: {
    getCurrentUser: vi.fn(),
  },
}));

const mockUser: User = {
  id: '1',
  email: 'admin@test.com',
  displayName: 'Admin User',
  isAdmin: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockNonAdminUser: User = {
  id: '2',
  email: 'user@test.com',
  displayName: 'Regular User',
  isAdmin: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// Mock the AuthContext
const mockAuthContext = {
  user: null,
  token: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  isLoading: false,
  isAuthenticated: false,
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

const TestComponent = () => <div>Admin Content</div>;

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('AdminGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner when auth is loading', () => {
    mockAuthContext.isLoading = true;
    mockAuthContext.user = null;

    renderWithRouter(
      <AdminGuard>
        <TestComponent />
      </AdminGuard>
    );

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('redirects to dashboard when user is not admin', () => {
    mockAuthContext.isLoading = false;
    mockAuthContext.user = mockNonAdminUser;

    renderWithRouter(
      <AdminGuard>
        <TestComponent />
      </AdminGuard>
    );

    // Should not render the admin content
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('redirects to dashboard when user is null', () => {
    mockAuthContext.isLoading = false;
    mockAuthContext.user = null;

    renderWithRouter(
      <AdminGuard>
        <TestComponent />
      </AdminGuard>
    );

    // Should not render the admin content
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('renders children when user is admin', () => {
    mockAuthContext.isLoading = false;
    mockAuthContext.user = mockUser;

    renderWithRouter(
      <AdminGuard>
        <TestComponent />
      </AdminGuard>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });
});