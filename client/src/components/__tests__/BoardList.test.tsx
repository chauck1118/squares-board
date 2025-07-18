import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import BoardList from '../BoardList';
import { apiService } from '../../services/api';
import { BoardSummary } from '../../types/board';

// Mock the API service
vi.mock('../../services/api', () => ({
  apiService: {
    getBoards: vi.fn(),
  },
}));

const mockApiService = apiService as any;

// Mock data
const mockBoards: BoardSummary[] = [
  {
    id: '1',
    name: 'March Madness 2024',
    pricePerSquare: 10,
    status: 'OPEN',
    totalSquares: 45,
    claimedSquares: 45,
    paidSquares: 30,
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Championship Pool',
    pricePerSquare: 25,
    status: 'FILLED',
    totalSquares: 100,
    claimedSquares: 100,
    paidSquares: 100,
    createdAt: '2024-03-02T00:00:00Z',
    updatedAt: '2024-03-02T00:00:00Z',
  },
  {
    id: '3',
    name: 'Elite Eight Special',
    pricePerSquare: 5,
    status: 'ACTIVE',
    totalSquares: 100,
    claimedSquares: 100,
    paidSquares: 100,
    createdAt: '2024-03-03T00:00:00Z',
    updatedAt: '2024-03-03T00:00:00Z',
  },
];

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('BoardList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockApiService.getBoards.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    renderWithRouter(<BoardList />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders boards successfully', async () => {
    mockApiService.getBoards.mockResolvedValue({ boards: mockBoards });
    
    renderWithRouter(<BoardList />);
    
    await waitFor(() => {
      expect(screen.getByText('March Madness 2024')).toBeInTheDocument();
      expect(screen.getByText('Championship Pool')).toBeInTheDocument();
      expect(screen.getByText('Elite Eight Special')).toBeInTheDocument();
    });
  });

  it('displays board status indicators correctly', async () => {
    mockApiService.getBoards.mockResolvedValue({ boards: mockBoards });
    
    renderWithRouter(<BoardList />);
    
    await waitFor(() => {
      expect(screen.getByText('Open')).toBeInTheDocument();
      expect(screen.getByText('Filled')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('displays board statistics correctly', async () => {
    mockApiService.getBoards.mockResolvedValue({ boards: mockBoards });
    
    renderWithRouter(<BoardList />);
    
    await waitFor(() => {
      // Check price formatting
      expect(screen.getByText('$10.00')).toBeInTheDocument();
      expect(screen.getByText('$25.00')).toBeInTheDocument();
      expect(screen.getByText('$5.00')).toBeInTheDocument();
      
      // Check squares claimed
      expect(screen.getByText('45 / 100')).toBeInTheDocument();
      expect(screen.getAllByText('100 / 100')).toHaveLength(4); // 2 boards × 2 fields each (claimed + paid)
    });
  });

  it('displays progress bars correctly', async () => {
    mockApiService.getBoards.mockResolvedValue({ boards: mockBoards });
    
    renderWithRouter(<BoardList />);
    
    await waitFor(() => {
      // Check progress percentages
      expect(screen.getByText('30%')).toBeInTheDocument(); // 30/100 paid squares
      expect(screen.getAllByText('100%')).toHaveLength(2); // Two boards with 100% paid
    });
  });

  it('displays appropriate action indicators for different statuses', async () => {
    mockApiService.getBoards.mockResolvedValue({ boards: mockBoards });
    
    renderWithRouter(<BoardList />);
    
    await waitFor(() => {
      expect(screen.getByText('Available to join')).toBeInTheDocument();
      expect(screen.getByText('Awaiting assignment')).toBeInTheDocument();
      expect(screen.getByText('View your squares')).toBeInTheDocument();
    });
  });

  it('renders error state when API call fails', async () => {
    const errorMessage = 'Failed to load boards';
    mockApiService.getBoards.mockRejectedValue({
      response: {
        data: {
          error: {
            message: errorMessage,
          },
        },
      },
    });
    
    renderWithRouter(<BoardList />);
    
    await waitFor(() => {
      expect(screen.getByText('Error loading boards')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('renders empty state when no boards are available', async () => {
    mockApiService.getBoards.mockResolvedValue({ boards: [] });
    
    renderWithRouter(<BoardList />);
    
    await waitFor(() => {
      expect(screen.getByText('No boards available')).toBeInTheDocument();
      expect(screen.getByText('There are no March Madness boards available at this time.')).toBeInTheDocument();
    });
  });

  it('creates correct links to board detail pages', async () => {
    mockApiService.getBoards.mockResolvedValue({ boards: mockBoards });
    
    renderWithRouter(<BoardList />);
    
    await waitFor(() => {
      const links = screen.getAllByRole('link');
      expect(links[0]).toHaveAttribute('href', '/boards/1');
      expect(links[1]).toHaveAttribute('href', '/boards/2');
      expect(links[2]).toHaveAttribute('href', '/boards/3');
    });
  });

  it('handles API errors gracefully with generic message', async () => {
    mockApiService.getBoards.mockRejectedValue(new Error('Network error'));
    
    renderWithRouter(<BoardList />);
    
    await waitFor(() => {
      expect(screen.getByText('Error loading boards')).toBeInTheDocument();
      expect(screen.getByText('Failed to load boards')).toBeInTheDocument();
    });
  });
});