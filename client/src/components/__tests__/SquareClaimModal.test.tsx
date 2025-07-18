import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import SquareClaimModal from '../SquareClaimModal';
import { BoardDetail, Square } from '../../types/board';

// Mock data
const mockBoard: BoardDetail = {
  id: '1',
  name: 'Test Board',
  pricePerSquare: 10,
  status: 'OPEN',
  totalSquares: 50,
  claimedSquares: 50,
  paidSquares: 40,
  createdAt: '2024-03-01T00:00:00Z',
  updatedAt: '2024-03-01T00:00:00Z',
  squares: [],
  payoutStructure: null,
  games: [],
};

const mockUserSquares: Square[] = [
  {
    id: '1',
    boardId: '1',
    userId: 'user1',
    gridPosition: null,
    paymentStatus: 'PAID',
    winningTeamNumber: null,
    losingTeamNumber: null,
    createdAt: '2024-03-01T00:00:00Z',
  },
  {
    id: '2',
    boardId: '1',
    userId: 'user1',
    gridPosition: null,
    paymentStatus: 'PENDING',
    winningTeamNumber: null,
    losingTeamNumber: null,
    createdAt: '2024-03-01T00:00:00Z',
  },
];

const defaultProps = {
  board: mockBoard,
  userSquares: mockUserSquares,
  onClaim: vi.fn(),
  onClose: vi.fn(),
  isLoading: false,
};

describe('SquareClaimModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with board information', () => {
    render(<SquareClaimModal {...defaultProps} />);
    
    expect(screen.getByText('Claim Squares')).toBeInTheDocument();
    expect(screen.getByText('Test Board')).toBeInTheDocument();
    expect(screen.getByText('$10.00 per square')).toBeInTheDocument();
  });

  it('displays current user square status', () => {
    render(<SquareClaimModal {...defaultProps} />);
    
    expect(screen.getByText('2 / 10')).toBeInTheDocument(); // Current squares
    expect(screen.getByText('50')).toBeInTheDocument(); // Available squares (100 - 50 claimed)
  });

  it('calculates maximum squares correctly', () => {
    render(<SquareClaimModal {...defaultProps} />);
    
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('max', '8'); // min(10 - 2 user squares, 100 - 50 claimed)
  });

  it('updates number of squares with buttons', () => {
    render(<SquareClaimModal {...defaultProps} />);
    
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    const plusButton = screen.getByText('+');
    const minusButton = screen.getByText('-');
    
    expect(input.value).toBe('1');
    
    fireEvent.click(plusButton);
    expect(input.value).toBe('2');
    
    fireEvent.click(minusButton);
    expect(input.value).toBe('1');
  });

  it('prevents going below 1 or above maximum', () => {
    render(<SquareClaimModal {...defaultProps} />);
    
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    const plusButton = screen.getByText('+');
    const minusButton = screen.getByText('-');
    
    // Try to go below 1
    fireEvent.click(minusButton);
    expect(input.value).toBe('1');
    
    // Go to maximum
    for (let i = 0; i < 10; i++) {
      fireEvent.click(plusButton);
    }
    expect(input.value).toBe('8'); // Maximum available
  });

  it('calculates total cost correctly', () => {
    render(<SquareClaimModal {...defaultProps} />);
    
    const plusButton = screen.getByText('+');
    
    expect(screen.getByText('$10.00')).toBeInTheDocument(); // 1 * $10
    
    fireEvent.click(plusButton);
    expect(screen.getByText('$20.00')).toBeInTheDocument(); // 2 * $10
  });

  it('displays payment notice', () => {
    render(<SquareClaimModal {...defaultProps} />);
    
    expect(screen.getByText('Payment Required:')).toBeInTheDocument();
    expect(screen.getByText(/Your squares will be marked as "pending"/)).toBeInTheDocument();
  });

  it('calls onClaim with correct number when form is submitted', async () => {
    const mockOnClaim = vi.fn().mockResolvedValue(undefined);
    
    render(<SquareClaimModal {...defaultProps} onClaim={mockOnClaim} />);
    
    const plusButton = screen.getByText('+');
    fireEvent.click(plusButton); // Set to 2 squares
    
    const claimButton = screen.getByText('Claim 2 Squares');
    fireEvent.click(claimButton);
    
    await waitFor(() => {
      expect(mockOnClaim).toHaveBeenCalledWith(2);
    });
  });

  it('displays error message when claim fails', async () => {
    const mockOnClaim = vi.fn().mockRejectedValue(new Error('Claim failed'));
    
    render(<SquareClaimModal {...defaultProps} onClaim={mockOnClaim} />);
    
    const claimButton = screen.getByText('Claim 1 Square');
    fireEvent.click(claimButton);
    
    await waitFor(() => {
      expect(screen.getByText('Claim failed')).toBeInTheDocument();
    });
  });

  it('shows loading state when claiming', () => {
    render(<SquareClaimModal {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Claiming...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /claiming/i })).toBeDisabled();
  });

  it('calls onClose when cancel button is clicked', () => {
    const mockOnClose = vi.fn();
    
    render(<SquareClaimModal {...defaultProps} onClose={mockOnClose} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when X button is clicked', () => {
    const mockOnClose = vi.fn();
    
    render(<SquareClaimModal {...defaultProps} onClose={mockOnClose} />);
    
    const closeButton = screen.getByRole('button', { name: '' }); // X button
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('disables form when user has reached maximum squares', () => {
    const userWith10Squares = Array.from({ length: 10 }, (_, i) => ({
      id: `square-${i}`,
      boardId: '1',
      userId: 'user1',
      gridPosition: null,
      paymentStatus: 'PAID' as const,
      winningTeamNumber: null,
      losingTeamNumber: null,
      createdAt: '2024-03-01T00:00:00Z',
    }));
    
    render(<SquareClaimModal {...defaultProps} userSquares={userWith10Squares} />);
    
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('max', '0');
    
    const claimButton = screen.getByRole('button', { name: /claim/i });
    expect(claimButton).toBeDisabled();
  });

  it('handles direct input changes', () => {
    render(<SquareClaimModal {...defaultProps} />);
    
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: '5' } });
    expect(input.value).toBe('5');
    
    expect(screen.getByText('$50.00')).toBeInTheDocument(); // 5 * $10
  });

  it('validates input bounds on direct input', () => {
    render(<SquareClaimModal {...defaultProps} />);
    
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    
    // Try to enter value above maximum
    fireEvent.change(input, { target: { value: '20' } });
    expect(input.value).toBe('8'); // Should be clamped to maximum
    
    // Try to enter value below minimum
    fireEvent.change(input, { target: { value: '0' } });
    expect(input.value).toBe('1'); // Should be clamped to minimum
  });
});