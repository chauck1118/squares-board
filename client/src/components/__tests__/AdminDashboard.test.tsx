import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from '../AdminDashboard';
import { listAllBoards } from '../../services/graphql-admin';
import { BoardStatus } from '../../types/amplify-models';

// Mock the GraphQL service
jest.mock('../../services/graphql-admin', () => ({
  listAllBoards: jest.fn(),
}));

// Mock the Header component
jest.mock('../Header', () => () => <div data-testid="header">Header</div>);

describe('AdminDashboard', () => {
  const mockBoards = {
    data: [
      {
        id: 'board1',
        name: 'Test Board 1',
        pricePerSquare: 10,
        status: BoardStatus.OPEN,
        totalSquares: 100,
        claimedSquares: 25,
        paidSquares: 20,
        createdAt: '2025-07-01T12:00:00Z',
        updatedAt: '2025-07-01T12:00:00Z',
      },
      {
        id: 'board2',
        name: 'Test Board 2',
        pricePerSquare: 15,
        status: BoardStatus.ACTIVE,
        totalSquares: 100,
        claimedSquares: 100,
        paidSquares: 100,
        createdAt: '2025-07-02T12:00:00Z',
        updatedAt: '2025-07-02T12:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (listAllBoards as jest.Mock).mockReturnValue(new Promise(() => {}));
    
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders boards when data is loaded', async () => {
    (listAllBoards as jest.Mock).mockResolvedValue(mockBoards);
    
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Test Board 1')).toBeInTheDocument();
      expect(screen.getByText('Test Board 2')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('$10')).toBeInTheDocument();
    expect(screen.getByText('$15')).toBeInTheDocument();
    expect(screen.getByText('25 / 100')).toBeInTheDocument();
    expect(screen.getByText('100 / 100')).toBeInTheDocument();
  });

  it('renders error state when API call fails', async () => {
    (listAllBoards as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load boards. Please try again.')).toBeInTheDocument();
    });
  });

  it('renders empty state when no boards exist', async () => {
    (listAllBoards as jest.Mock).mockResolvedValue({ data: [] });
    
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('No boards')).toBeInTheDocument();
      expect(screen.getByText('Get started by creating a new board.')).toBeInTheDocument();
    });
  });

  it('calculates statistics correctly', async () => {
    (listAllBoards as jest.Mock).mockResolvedValue(mockBoards);
    
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      // Total Boards
      expect(screen.getByText('2')).toBeInTheDocument();
      
      // Active Boards
      expect(screen.getByText('1')).toBeInTheDocument();
      
      // Pending Boards
      expect(screen.getByText('1')).toBeInTheDocument();
      
      // Total Revenue
      expect(screen.getByText('$1,700')).toBeInTheDocument();
    });
  });
});