import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminDashboard from '../AdminDashboard';
import { BoardSummary } from '../../types/board';
import { vi } from 'vitest';

// Mock the API service
vi.mock('../../services/api', () => ({
  apiService: {
    getBoards: vi.fn(),
  },
}));

import { apiService } from '../../services/api';
const mockGetBoards = vi.mocked(apiService.getBoards);

// Mock the AuthContext
const mockAuthContext = {
  user: {
    id: '1',
    email: 'admin@test.com',
    displayName: 'Admin User',
    isAdmin: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  token: 'mock-token',
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  isLoading: false,
  isAuthenticated: true,
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

const mockBoards: BoardSummary[] = [
  {
    id: '1',
    name: 'Test Board 1',
    pricePerSquare: 10,
    status: 'OPEN',
    totalSquares: 50,
    claimedSquares: 50,
    paidSquares: 30,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Test Board 2',
    pricePerSquare: 20,
    status: 'ACTIVE',
    totalSquares: 100,
    claimedSquares: 100,
    paidSquares: 100,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockGetBoards.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithRouter(<AdminDashboard />);

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders admin dashboard with boards', async () => {
    mockGetBoards.mockResolvedValue({ boards: mockBoards });

    renderWithRouter(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Board 1')).toBeInTheDocument();
    expect(screen.getByText('Test Board 2')).toBeInTheDocument();
    expect(screen.getByText('Create New Board')).toBeInTheDocument();
  });

  it('renders empty state when no boards exist', async () => {
    mockGetBoards.mockResolvedValue({ boards: [] });

    renderWithRouter(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No boards')).toBeInTheDocument();
    });

    expect(screen.getByText('Get started by creating a new board.')).toBeInTheDocument();
  });

  it('renders error state when API call fails', async () => {
    mockGetBoards.mockRejectedValue(new Error('API Error'));

    renderWithRouter(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load boards. Please try again.')).toBeInTheDocument();
    });
  });

  it('displays correct board statistics', async () => {
    mockGetBoards.mockResolvedValue({ boards: mockBoards });

    renderWithRouter(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    // Total boards
    expect(screen.getByText('2')).toBeInTheDocument(); // Total boards count

    // Active boards (status === 'ACTIVE')
    const activeBoards = mockBoards.filter(b => b.status === 'ACTIVE').length;
    expect(screen.getByText(activeBoards.toString())).toBeInTheDocument();

    // Total revenue
    const totalRevenue = mockBoards.reduce((sum, board) => sum + (board.paidSquares * board.pricePerSquare), 0);
    expect(screen.getByText(`$${totalRevenue.toLocaleString()}`)).toBeInTheDocument();
  });

  it('displays correct status badges', async () => {
    mockGetBoards.mockResolvedValue({ boards: mockBoards });

    renderWithRouter(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Open')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('shows progress bars for board completion', async () => {
    mockGetBoards.mockResolvedValue({ boards: mockBoards });

    renderWithRouter(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('30 paid')).toBeInTheDocument(); // First board
      expect(screen.getByText('100 paid')).toBeInTheDocument(); // Second board
    });
  });
});