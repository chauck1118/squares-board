import { renderHook, act } from '@testing-library/react-hooks';
import { useScoringRealtime } from '../useScoringRealtime';
import { graphqlScoringService } from '../../services/graphql-scoring';

// Mock the graphqlScoringService
jest.mock('../../services/graphql-scoring', () => ({
  graphqlScoringService: {
    getBoardScoring: jest.fn(),
    getRecentWinners: jest.fn(),
    getTournamentProgress: jest.fn(),
    subscribeToGameUpdates: jest.fn(),
    calculatePayout: jest.fn(),
    formatRoundName: jest.fn(),
  }
}));

// Mock AWS Amplify
jest.mock('aws-amplify/data', () => ({
  generateClient: jest.fn(() => ({
    models: {
      Game: {
        list: jest.fn(),
        observeQuery: jest.fn(() => ({
          subscribe: jest.fn(() => ({
            unsubscribe: jest.fn()
          }))
        }))
      },
      Board: {
        get: jest.fn()
      },
      Square: {
        get: jest.fn()
      },
      User: {
        get: jest.fn()
      }
    }
  }))
}));

describe('useScoringRealtime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock implementation of getBoardScoring
    (graphqlScoringService.getBoardScoring as jest.Mock).mockResolvedValue({
      board: {
        id: 'board-1',
        name: 'Test Board',
        status: 'ACTIVE',
        payoutStructure: {
          round1: 25,
          round2: 50,
          sweet16: 100,
          elite8: 200,
          final4: 400,
          championship: 800,
        }
      },
      games: [
        {
          id: 'game-1',
          boardId: 'board-1',
          gameNumber: 1,
          round: 'ROUND1',
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
            user: {
              id: 'user-1',
              displayName: 'John Doe',
            },
          },
        }
      ]
    });
    
    // Mock implementation of getRecentWinners
    (graphqlScoringService.getRecentWinners as jest.Mock).mockResolvedValue([
      {
        id: 'game-1',
        boardId: 'board-1',
        gameNumber: 1,
        round: 'ROUND1',
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
          user: {
            id: 'user-1',
            displayName: 'John Doe',
          },
        },
      }
    ]);
    
    // Mock implementation of getTournamentProgress
    (graphqlScoringService.getTournamentProgress as jest.Mock).mockResolvedValue({
      currentRound: 'ROUND1',
      completedRounds: [],
      upcomingRounds: ['ROUND2', 'SWEET16', 'ELITE8', 'FINAL4', 'CHAMPIONSHIP'],
      roundStats: {
        'ROUND1': { total: 32, completed: 2, inProgress: 4, scheduled: 26 },
      }
    });
  });

  it('fetches initial data on mount', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useScoringRealtime({ boardId: 'board-1' })
    );
    
    // Initial state should have loading true
    expect(result.current.loading).toBe(true);
    
    // Wait for data to load
    await waitForNextUpdate();
    
    // Check that data was loaded
    expect(result.current.loading).toBe(false);
    expect(result.current.board).not.toBeNull();
    expect(result.current.games.length).toBe(1);
    expect(result.current.recentWinners.length).toBe(1);
    expect(result.current.tournamentProgress).not.toBeNull();
    
    // Verify service calls
    expect(graphqlScoringService.getBoardScoring).toHaveBeenCalledWith('board-1');
    expect(graphqlScoringService.getRecentWinners).toHaveBeenCalledWith('board-1', 5);
    expect(graphqlScoringService.getTournamentProgress).toHaveBeenCalledWith('board-1');
  });

  it('handles errors gracefully', async () => {
    // Mock an error
    (graphqlScoringService.getBoardScoring as jest.Mock).mockRejectedValue(
      new Error('Failed to fetch data')
    );
    
    const { result, waitForNextUpdate } = renderHook(() => 
      useScoringRealtime({ boardId: 'board-1' })
    );
    
    // Wait for error to be set
    await waitForNextUpdate();
    
    // Check error state
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Failed to fetch data');
    
    // Test error clearing
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBeNull();
  });

  it('allows manual refetch of data', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useScoringRealtime({ boardId: 'board-1' })
    );
    
    // Wait for initial data load
    await waitForNextUpdate();
    
    // Clear mocks to check refetch calls
    jest.clearAllMocks();
    
    // Trigger refetch
    await act(async () => {
      await result.current.refetch();
    });
    
    // Verify service calls were made again
    expect(graphqlScoringService.getBoardScoring).toHaveBeenCalledWith('board-1');
    expect(graphqlScoringService.getRecentWinners).toHaveBeenCalledWith('board-1', 5);
    expect(graphqlScoringService.getTournamentProgress).toHaveBeenCalledWith('board-1');
  });

  it('disables real-time updates when enableRealtime is false', async () => {
    const { waitForNextUpdate } = renderHook(() => 
      useScoringRealtime({ boardId: 'board-1', enableRealtime: false })
    );
    
    // Wait for initial data load
    await waitForNextUpdate();
    
    // Verify subscription was not set up
    expect(graphqlScoringService.subscribeToGameUpdates).not.toHaveBeenCalled();
  });

  it('respects recentWinnersLimit parameter', async () => {
    const { waitForNextUpdate } = renderHook(() => 
      useScoringRealtime({ boardId: 'board-1', recentWinnersLimit: 10 })
    );
    
    // Wait for initial data load
    await waitForNextUpdate();
    
    // Verify limit was passed to service
    expect(graphqlScoringService.getRecentWinners).toHaveBeenCalledWith('board-1', 10);
  });
});