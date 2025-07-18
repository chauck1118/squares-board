import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScoringTable from '../ScoringTable';
import { Game, PayoutStructure } from '../../types/board';

const mockPayoutStructure: PayoutStructure = {
  id: 'payout-1',
  boardId: 'board-1',
  round1: 25,
  round2: 50,
  sweet16: 100,
  elite8: 200,
  final4: 400,
  championship: 800,
};

const mockGames: Game[] = [
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
    gameNumber: 2,
    round: 'Round 1',
    team1: 'Kansas',
    team2: 'Villanova',
    team1Score: 65,
    team2Score: 62,
    status: 'COMPLETED',
    winnerSquareId: 'square-2',
    scheduledTime: '2024-03-21T14:00:00Z',
    createdAt: '2024-03-20T10:00:00Z',
    updatedAt: '2024-03-21T16:30:00Z',
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
    payout: 25,
  },
  {
    id: 'game-3',
    boardId: 'board-1',
    gameNumber: 33,
    round: 'Round 2',
    team1: 'Duke',
    team2: 'Kansas',
    team1Score: null,
    team2Score: null,
    status: 'SCHEDULED',
    winnerSquareId: null,
    scheduledTime: '2024-03-23T15:00:00Z',
    createdAt: '2024-03-20T10:00:00Z',
    updatedAt: '2024-03-20T10:00:00Z',
  },
  {
    id: 'game-4',
    boardId: 'board-1',
    gameNumber: 49,
    round: 'Sweet 16',
    team1: 'Gonzaga',
    team2: 'Arizona',
    team1Score: 82,
    team2Score: 79,
    status: 'IN_PROGRESS',
    winnerSquareId: null,
    scheduledTime: '2024-03-25T18:00:00Z',
    createdAt: '2024-03-20T10:00:00Z',
    updatedAt: '2024-03-25T19:30:00Z',
  },
];

describe('ScoringTable', () => {
  it('renders empty state when no games are provided', () => {
    render(<ScoringTable games={[]} payoutStructure={mockPayoutStructure} />);
    
    expect(screen.getByText('Tournament Scoring')).toBeInTheDocument();
    expect(screen.getByText('No games scheduled')).toBeInTheDocument();
    expect(screen.getByText('Games will appear here once the tournament begins.')).toBeInTheDocument();
  });

  it('renders games grouped by round', () => {
    render(<ScoringTable games={mockGames} payoutStructure={mockPayoutStructure} />);
    
    expect(screen.getByText('Tournament Scoring')).toBeInTheDocument();
    expect(screen.getByText('Round 1')).toBeInTheDocument();
    expect(screen.getByText('Round 2')).toBeInTheDocument();
    expect(screen.getByText('Sweet 16')).toBeInTheDocument();
  });

  it('displays correct payout amounts for each round', () => {
    render(<ScoringTable games={mockGames} payoutStructure={mockPayoutStructure} />);
    
    expect(screen.getByText('$25.00 per winner')).toBeInTheDocument();
    expect(screen.getByText('$50.00 per winner')).toBeInTheDocument();
    expect(screen.getByText('$100.00 per winner')).toBeInTheDocument();
  });

  it('displays game information correctly', () => {
    render(<ScoringTable games={mockGames} payoutStructure={mockPayoutStructure} />);
    
    // Check game numbers
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('#33')).toBeInTheDocument();
    expect(screen.getByText('#49')).toBeInTheDocument();

    // Check team names - use getAllByText since Duke appears twice
    expect(screen.getAllByText('Duke')).toHaveLength(2);
    expect(screen.getByText('UNC')).toBeInTheDocument();
    expect(screen.getAllByText('Kansas')).toHaveLength(2);
    expect(screen.getByText('Villanova')).toBeInTheDocument();
  });

  it('displays scores for completed games', () => {
    render(<ScoringTable games={mockGames} payoutStructure={mockPayoutStructure} />);
    
    expect(screen.getByText('78-74')).toBeInTheDocument();
    expect(screen.getByText('65-62')).toBeInTheDocument();
  });

  it('displays winning digits for completed games', () => {
    render(<ScoringTable games={mockGames} payoutStructure={mockPayoutStructure} />);
    
    expect(screen.getByText('8-4')).toBeInTheDocument();
    expect(screen.getByText('5-2')).toBeInTheDocument();
  });

  it('displays game status correctly', () => {
    render(<ScoringTable games={mockGames} payoutStructure={mockPayoutStructure} />);
    
    expect(screen.getAllByText('Final')).toHaveLength(2);
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('displays winner information for completed games', () => {
    render(<ScoringTable games={mockGames} payoutStructure={mockPayoutStructure} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Position 84')).toBeInTheDocument();
    expect(screen.getByText('Position 52')).toBeInTheDocument();
    expect(screen.getAllByText('$25.00')).toHaveLength(2);
  });

  it('displays TBD for scheduled games', () => {
    render(<ScoringTable games={mockGames} payoutStructure={mockPayoutStructure} />);
    
    const tbdElements = screen.getAllByText('TBD');
    expect(tbdElements.length).toBeGreaterThan(0);
  });

  it('displays -- for games without scores', () => {
    render(<ScoringTable games={mockGames} payoutStructure={mockPayoutStructure} />);
    
    const dashElements = screen.getAllByText('--');
    expect(dashElements.length).toBeGreaterThan(0);
  });

  it('handles games without winners', () => {
    const gamesWithoutWinner: Game[] = [
      {
        id: 'game-no-winner',
        boardId: 'board-1',
        gameNumber: 5,
        round: 'Round 1',
        team1: 'Team A',
        team2: 'Team B',
        team1Score: 70,
        team2Score: 68,
        status: 'COMPLETED',
        winnerSquareId: null,
        scheduledTime: '2024-03-21T12:00:00Z',
        createdAt: '2024-03-20T10:00:00Z',
        updatedAt: '2024-03-21T14:30:00Z',
      },
    ];

    render(<ScoringTable games={gamesWithoutWinner} payoutStructure={mockPayoutStructure} />);
    
    expect(screen.getByText('No winner')).toBeInTheDocument();
  });

  it('handles null payout structure gracefully', () => {
    render(<ScoringTable games={mockGames} payoutStructure={null} />);
    
    expect(screen.getByText('Tournament Scoring')).toBeInTheDocument();
    expect(screen.getAllByText('$0.00 per winner')).toHaveLength(3); // One for each round
  });

  it('applies custom className', () => {
    const { container } = render(
      <ScoringTable games={mockGames} payoutStructure={mockPayoutStructure} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('displays explanation text', () => {
    render(<ScoringTable games={mockGames} payoutStructure={mockPayoutStructure} />);
    
    expect(screen.getByText('Winners are determined by the last digit of each team\'s final score')).toBeInTheDocument();
  });

  it('sorts games by game number within each round', () => {
    const unsortedGames: Game[] = [
      { ...mockGames[1] }, // Game #2
      { ...mockGames[0] }, // Game #1
    ];

    render(<ScoringTable games={unsortedGames} payoutStructure={mockPayoutStructure} />);
    
    const gameNumbers = screen.getAllByText(/^#\d+$/);
    expect(gameNumbers[0]).toHaveTextContent('#1');
    expect(gameNumbers[1]).toHaveTextContent('#2');
  });

  it('displays rounds in correct tournament order', () => {
    const mixedRoundGames: Game[] = [
      { ...mockGames[3] }, // Sweet 16
      { ...mockGames[0] }, // Round 1
      { ...mockGames[2] }, // Round 2
    ];

    render(<ScoringTable games={mixedRoundGames} payoutStructure={mockPayoutStructure} />);
    
    const roundHeaders = screen.getAllByRole('heading', { level: 3 });
    expect(roundHeaders[0]).toHaveTextContent('Round 1');
    expect(roundHeaders[1]).toHaveTextContent('Round 2');
    expect(roundHeaders[2]).toHaveTextContent('Sweet 16');
  });
});