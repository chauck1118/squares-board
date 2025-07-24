import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TournamentProgress from '../TournamentProgress';

// Mock the graphqlScoringService
jest.mock('../../services/graphql-scoring', () => ({
  graphqlScoringService: {
    formatRoundName: (round: string) => {
      const roundNames: Record<string, string> = {
        'ROUND1': 'Round 1',
        'ROUND2': 'Round 2',
        'SWEET16': 'Sweet 16',
        'ELITE8': 'Elite 8',
        'FINAL4': 'Final 4',
        'CHAMPIONSHIP': 'Championship',
      };
      return roundNames[round] || round;
    }
  }
}));

// Mock AWS Amplify
jest.mock('aws-amplify/data', () => ({
  generateClient: jest.fn(() => ({
    models: {
      Game: {
        list: jest.fn(),
        observeQuery: jest.fn()
      }
    }
  }))
}));

const mockTournamentProgress = {
  currentRound: 'SWEET16',
  completedRounds: ['ROUND1', 'ROUND2'],
  upcomingRounds: ['ELITE8', 'FINAL4', 'CHAMPIONSHIP'],
  roundStats: {
    'ROUND1': { total: 32, completed: 32, inProgress: 0, scheduled: 0 },
    'ROUND2': { total: 16, completed: 16, inProgress: 0, scheduled: 0 },
    'SWEET16': { total: 8, completed: 2, inProgress: 2, scheduled: 4 },
    'ELITE8': { total: 4, completed: 0, inProgress: 0, scheduled: 4 },
    'FINAL4': { total: 2, completed: 0, inProgress: 0, scheduled: 2 },
    'CHAMPIONSHIP': { total: 1, completed: 0, inProgress: 0, scheduled: 1 },
  }
};

describe('TournamentProgress', () => {
  it('renders tournament progress header', () => {
    render(<TournamentProgress {...mockTournamentProgress} />);
    
    expect(screen.getByText('Tournament Progress')).toBeInTheDocument();
    expect(screen.getByText('Currently in Sweet 16')).toBeInTheDocument();
  });

  it('displays round progression timeline', () => {
    render(<TournamentProgress {...mockTournamentProgress} />);
    
    // Check round indicators
    expect(screen.getByText('Round')).toBeInTheDocument();
    expect(screen.getByText('Sweet')).toBeInTheDocument();
    expect(screen.getByText('Elite')).toBeInTheDocument();
    expect(screen.getByText('Final')).toBeInTheDocument();
    expect(screen.getByText('Championship')).toBeInTheDocument();
  });

  it('shows current round details with progress bar', () => {
    render(<TournamentProgress {...mockTournamentProgress} />);
    
    expect(screen.getByText('Sweet 16')).toBeInTheDocument();
    expect(screen.getByText('2 of 8 games completed')).toBeInTheDocument();
    
    // Check progress indicators
    expect(screen.getByText('2 completed')).toBeInTheDocument();
    expect(screen.getByText('2 in progress')).toBeInTheDocument();
    expect(screen.getByText('4 scheduled')).toBeInTheDocument();
  });

  it('displays round details for all active rounds', () => {
    render(<TournamentProgress {...mockTournamentProgress} />);
    
    // Check round details
    expect(screen.getByText('Round 1')).toBeInTheDocument();
    expect(screen.getByText('Round 2')).toBeInTheDocument();
    expect(screen.getByText('Sweet 16')).toBeInTheDocument();
    expect(screen.getByText('Elite 8')).toBeInTheDocument();
    expect(screen.getByText('Final 4')).toBeInTheDocument();
    expect(screen.getByText('Championship')).toBeInTheDocument();
    
    // Check game counts
    expect(screen.getByText('32/32 games')).toBeInTheDocument();
    expect(screen.getByText('16/16 games')).toBeInTheDocument();
    expect(screen.getByText('8/8 games')).toBeInTheDocument();
    expect(screen.getByText('4/4 games')).toBeInTheDocument();
    expect(screen.getByText('2/2 games')).toBeInTheDocument();
    expect(screen.getByText('1/1 games')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <TournamentProgress {...mockTournamentProgress} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles tournament not started state', () => {
    const notStartedProgress = {
      currentRound: '',
      completedRounds: [],
      upcomingRounds: ['ROUND1', 'ROUND2', 'SWEET16', 'ELITE8', 'FINAL4', 'CHAMPIONSHIP'],
      roundStats: {
        'ROUND1': { total: 32, completed: 0, inProgress: 0, scheduled: 32 },
        'ROUND2': { total: 16, completed: 0, inProgress: 0, scheduled: 16 },
        'SWEET16': { total: 8, completed: 0, inProgress: 0, scheduled: 8 },
        'ELITE8': { total: 4, completed: 0, inProgress: 0, scheduled: 4 },
        'FINAL4': { total: 2, completed: 0, inProgress: 0, scheduled: 2 },
        'CHAMPIONSHIP': { total: 1, completed: 0, inProgress: 0, scheduled: 1 },
      }
    };
    
    render(<TournamentProgress {...notStartedProgress} />);
    
    expect(screen.getByText('Tournament not started')).toBeInTheDocument();
  });

  it('handles completed tournament state', () => {
    const completedProgress = {
      currentRound: 'CHAMPIONSHIP',
      completedRounds: ['ROUND1', 'ROUND2', 'SWEET16', 'ELITE8', 'FINAL4', 'CHAMPIONSHIP'],
      upcomingRounds: [],
      roundStats: {
        'ROUND1': { total: 32, completed: 32, inProgress: 0, scheduled: 0 },
        'ROUND2': { total: 16, completed: 16, inProgress: 0, scheduled: 0 },
        'SWEET16': { total: 8, completed: 8, inProgress: 0, scheduled: 0 },
        'ELITE8': { total: 4, completed: 4, inProgress: 0, scheduled: 0 },
        'FINAL4': { total: 2, completed: 2, inProgress: 0, scheduled: 0 },
        'CHAMPIONSHIP': { total: 1, completed: 1, inProgress: 0, scheduled: 0 },
      }
    };
    
    render(<TournamentProgress {...completedProgress} />);
    
    expect(screen.getByText('Currently in Championship')).toBeInTheDocument();
    expect(screen.getByText('1 of 1 games completed')).toBeInTheDocument();
  });
});