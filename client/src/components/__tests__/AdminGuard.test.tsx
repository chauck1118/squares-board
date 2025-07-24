import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminGuard from '../AdminGuard';
import { fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';

// Mock AWS Amplify Auth
jest.mock('aws-amplify/auth', () => ({
  fetchUserAttributes: jest.fn(),
  fetchAuthSession: jest.fn(),
}));

// Mock the Navigate component
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Navigate: () => <div data-testid="navigate">Redirecting...</div>,
}));

describe('AdminGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (fetchAuthSession as jest.Mock).mockReturnValue(new Promise(() => {}));
    
    render(
      <MemoryRouter>
        <AdminGuard>
          <div>Protected Content</div>
        </AdminGuard>
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders children when user is admin by attribute', async () => {
    (fetchAuthSession as jest.Mock).mockResolvedValue({
      tokens: {
        accessToken: {
          payload: {},
        },
      },
    });
    
    (fetchUserAttributes as jest.Mock).mockResolvedValue({
      'custom:isAdmin': 'true',
    });
    
    render(
      <MemoryRouter>
        <AdminGuard>
          <div>Protected Admin Content</div>
        </AdminGuard>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Protected Admin Content')).toBeInTheDocument();
    });
  });

  it('renders children when user is in admin group', async () => {
    (fetchAuthSession as jest.Mock).mockResolvedValue({
      tokens: {
        accessToken: {
          payload: {
            'cognito:groups': ['admins'],
          },
        },
      },
    });
    
    (fetchUserAttributes as jest.Mock).mockResolvedValue({
      'custom:isAdmin': 'false',
    });
    
    render(
      <MemoryRouter>
        <AdminGuard>
          <div>Protected Admin Content</div>
        </AdminGuard>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Protected Admin Content')).toBeInTheDocument();
    });
  });

  it('redirects when user is not admin', async () => {
    (fetchAuthSession as jest.Mock).mockResolvedValue({
      tokens: {
        accessToken: {
          payload: {
            'cognito:groups': ['users'],
          },
        },
      },
    });
    
    (fetchUserAttributes as jest.Mock).mockResolvedValue({
      'custom:isAdmin': 'false',
    });
    
    render(
      <MemoryRouter>
        <AdminGuard>
          <div>Protected Admin Content</div>
        </AdminGuard>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
    });
  });

  it('redirects when user is not authenticated', async () => {
    (fetchAuthSession as jest.Mock).mockResolvedValue({
      tokens: null,
    });
    
    render(
      <MemoryRouter>
        <AdminGuard>
          <div>Protected Admin Content</div>
        </AdminGuard>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
    });
  });

  it('redirects when authentication check fails', async () => {
    (fetchAuthSession as jest.Mock).mockRejectedValue(new Error('Not authenticated'));
    
    render(
      <MemoryRouter>
        <AdminGuard>
          <div>Protected Admin Content</div>
        </AdminGuard>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
    });
  });
});