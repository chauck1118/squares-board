import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import WinnerDisplay from '../WinnerDisplay';
import { Game } from '../../types/board';

const mockRecentWinners: Game[] = [
  {
    id: 'game-1',
    boardId: 'board-1',
    gameNumber: 1,
    round: 'Round 1',
    team1: 'Duke',
    team2: 'UNC',
    team1Score: 78,
    team2Score: 74,
    status: 'COMPLETED',
    winnerSquareId: 'square-1',
    scheduledTime: '2024-03-21T12:00:00Z',
    createdAt: '2024-03-20T10:00:00Z',
    updatedAt: '2024-03-21T14:30:00Z',
    winnerSquare: {
      id: 'square-1',
      gridPosition: 84,
      winningTeamNumber: 8,
      losingTeamNumber: 4,
      user: {
        id: 'user-1',
        displayName: 'John Doe',
      },
    },
    payout: 25,
  },
  {
    id: 'game-2',
    boardId: 'board-1',
    gameNumber: 33,
    round: 'Round 2',
    team1: 'Kansas',
    team2: 'Villanova',
    team1Score: 65,
    team2Score: 62,
    status: 'COMPLETED',
    winnerSquareId: 'square-2',
    scheduledTime: '2024-03-23T14:00:00Z',
    createdAt: '2024-03-20T10:00:00Z',
    updatedAt: '2024-03-23T16:30:00Z',
    winnerSquare: {
      id: 'square-2',
      gridPosition: 52,
      winningTeamNumber: 5,
      losingTeamNumber: 2,
      user: {
        id: 'user-2',
        displayName: 'Jane Smith',
      },
    },
    payout: 50,
  },
];

describe('WinnerDisplay', () => {
  it('renders nothing when no recent winners are provided', () => {
    const { container } = render(<WinnerDisplay recentWinners={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders recent winners header', () => {
    render(<WinnerDisplay recentWinners={mockRecentWinners} />);
    
    expect(screen.getByText('🎉 Recent Winners')).toBeInTheDocument();
    expect(screen.getByText('Latest game results and payouts')).toBeInTheDocument();
  });

  it('displays game information for each winner', () => {
    render(<WinnerDisplay recentWinners={mockRecentWinners} />);
    
    expect(screen.getByText('Game #1 - Round 1')).toBeInTheDocument();
    expect(screen.getByText('Game #33 - Round 2')).toBeInTheDocument();
    expect(screen.getByText('Duke vs UNC')).toBeInTheDocument();
    expect(screen.getByText('Kansas vs Villanova')).toBeInTheDocument();
  });

  it('displays final scores correctly', () => {
    render(<WinnerDisplay recentWinners={mockRecentWinners} />);
    
    expect(screen.getByText('78-74')).toBeInTheDocument();
    expect(screen.getByText('65-62')).toBeInTheDocument();
  });

  it('displays winning digits correctly', () => {
    render(<WinnerDisplay recentWinners={mockRecentWinners} />);
    
    expect(screen.getByText('8-4')).toBeInTheDocument();
    expect(screen.getByText('5-2')).toBeInTheDocument();
  });

  it('displays winner information', () => {
    render(<WinnerDisplay recentWinners={mockRecentWinners} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Square Position 84')).toBeInTheDocument();
    expect(screen.getByText('Square Position 52')).toBeInTheDocument();
  });

  it('displays payout amounts', () => {
    render(<WinnerDisplay recentWinners={mockRecentWinners} />);
    
    expect(screen.getByText('$25.00')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getAllByText('Payout')).toHaveLength(2);
  });

  it('displays user initials in avatar circles', () => {
    render(<WinnerDisplay recentWinners={mockRecentWinners} />);
    
    const initials = screen.getAllByText('J');
    expect(initials).toHaveLength(2); // John Doe and Jane Smith both have J
  });

  it('handles winner without user information', () => {
    const winnersWithoutUser: Game[] = [
      {
        ...mockRecentWinners[0],
        winnerSquare: {
          id: 'square-1',
          gridPosition: 84,
          winningTeamNumber: 8,
          losingTeamNumber: 4,
          user: null,
        },
      },
    ];

    render(<WinnerDisplay recentWinners={winnersWithoutUser} />);
    
    expect(screen.getByText('Unknown Player')).toBeInTheDocument();
    expect(screen.getByText('?')).toBeInTheDocument(); // Avatar initial
  });

  it('handles winner without grid position', () => {
    const winnersWithoutPosition: Game[] = [
      {
        ...mockRecentWinners[0],
        winnerSquare: {
          id: 'square-1',
          gridPosition: null,
          winningTeamNumber: 8,
          losingTeamNumber: 4,
          user: {
            id: 'user-1',
            displayName: 'John Doe',
          },
        },
      },
    ];

    render(<WinnerDisplay recentWinners={winnersWithoutPosition} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText(/Square Position/)).not.toBeInTheDocument();
  });

  it('handles winner without payout', () => {
    const winnersWithoutPayout: Game[] = [
      {
        ...mockRecentWinners[0],
        payout: undefined,
      },
    ];

    render(<WinnerDisplay recentWinners={winnersWithoutPayout} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Payout')).not.toBeInTheDocument();
  });

  it('shows "View All Winners" button when more than 3 winners', () => {
    const manyWinners = [
      ...mockRecentWinners,
      { ...mockRecentWinners[0], id: 'game-3', gameNumber: 3 },
      { ...mockRecentWinners[0], id: 'game-4', gameNumber: 4 },
    ];

    render(<WinnerDisplay recentWinners={manyWinners} />);
    
    expect(screen.getByText('View All Winners →')).toBeInTheDocument();
  });

  it('does not show "View All Winners" button when 3 or fewer winners', () => {
    render(<WinnerDisplay recentWinners={mockRecentWinners} />);
    
    expect(screen.queryByText('View All Winners →')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <WinnerDisplay recentWinners={mockRecentWinners} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles null scores gracefully', () => {
    const winnersWithNullScores: Game[] = [
      {
        ...mockRecentWinners[0],
        team1Score: null,
        team2Score: null,
      },
    ];

    render(<WinnerDisplay recentWinners={winnersWithNullScores} />);
    
    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('displays animation classes for visual effects', () => {
    const { container } = render(<WinnerDisplay recentWinners={mockRecentWinners} />);
    
    // Check for animate-pulse class on the indicator dots
    const animatedElements = container.querySelectorAll('.animate-pulse');
    expect(animatedElements.length).toBeGreaterThan(0);
  });
});