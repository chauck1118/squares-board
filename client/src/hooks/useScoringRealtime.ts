import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  GraphQLGame, 
  GraphQLBoard, 
  ScoringData, 
  graphqlScoringService 
} from '../services/graphql-scoring';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

// Create Amplify Data client for direct GraphQL operations
const client = generateClient<Schema>();

interface UseScoringRealtimeOptions {
  boardId: string;
  enableRealtime?: boolean;
  recentWinnersLimit?: number;
}

interface TournamentProgress {
  currentRound: string;
  completedRounds: string[];
  upcomingRounds: string[];
  roundStats: Record<string, { 
    total: number; 
    completed: number; 
    inProgress: number; 
    scheduled: number 
  }>;
}

interface UseScoringRealtimeReturn {
  // Data
  board: GraphQLBoard | null;
  games: GraphQLGame[];
  recentWinners: GraphQLGame[];
  tournamentProgress: TournamentProgress | null;
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Real-time indicators
  realtimeUpdates: string[]; // Game IDs that have recent updates
  
  // Actions
  refetch: () => Promise<void>;
  clearError: () => void;
}

/**
 * Custom hook for managing scoring data with real-time updates via GraphQL subscriptions
 */
export const useScoringRealtime = ({
  boardId,
  enableRealtime = true,
  recentWinnersLimit = 5,
}: UseScoringRealtimeOptions): UseScoringRealtimeReturn => {
  const [board, setBoard] = useState<GraphQLBoard | null>(null);
  const [games, setGames] = useState<GraphQLGame[]>([]);
  const [recentWinners, setRecentWinners] = useState<GraphQLGame[]>([]);
  const [tournamentProgress, setTournamentProgress] = useState<TournamentProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeUpdates, setRealtimeUpdates] = useState<string[]>([]);
  
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const realtimeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch initial scoring data
   */
  const fetchScoringData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Fetch board scoring data
      const scoringData: ScoringData = await graphqlScoringService.getBoardScoring(boardId);
      
      setBoard(scoringData.board);
      setGames(scoringData.games);

      // Fetch recent winners
      const winners = await graphqlScoringService.getRecentWinners(boardId, recentWinnersLimit);
      setRecentWinners(winners);

      // Fetch tournament progress data
      const progress = await graphqlScoringService.getTournamentProgress(boardId);
      setTournamentProgress(progress);

    } catch (err) {
      console.error('Error fetching scoring data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch scoring data');
    } finally {
      setLoading(false);
    }
  }, [boardId, recentWinnersLimit]);

  /**
   * Handle real-time game updates
   */
  const handleGameUpdate = useCallback((updatedGame: GraphQLGame) => {
    setGames(prevGames => {
      const existingIndex = prevGames.findIndex(game => game.id === updatedGame.id);
      
      if (existingIndex >= 0) {
        // Update existing game
        const newGames = [...prevGames];
        newGames[existingIndex] = updatedGame;
        return newGames.sort((a, b) => a.gameNumber - b.gameNumber);
      } else {
        // Add new game
        return [...prevGames, updatedGame].sort((a, b) => a.gameNumber - b.gameNumber);
      }
    });

    // Add to realtime updates indicator
    setRealtimeUpdates(prev => {
      if (!prev.includes(updatedGame.id)) {
        return [...prev, updatedGame.id];
      }
      return prev;
    });

    // Clear realtime indicator after 3 seconds
    if (realtimeTimeoutRef.current) {
      clearTimeout(realtimeTimeoutRef.current);
    }
    
    realtimeTimeoutRef.current = setTimeout(() => {
      setRealtimeUpdates(prev => prev.filter(id => id !== updatedGame.id));
    }, 3000);

    // Update recent winners if this game is completed with a winner
    if (updatedGame.status === 'COMPLETED' && updatedGame.winnerSquare) {
      setRecentWinners(prevWinners => {
        const existingWinnerIndex = prevWinners.findIndex(winner => winner.id === updatedGame.id);
        
        if (existingWinnerIndex >= 0) {
          // Update existing winner
          const newWinners = [...prevWinners];
          newWinners[existingWinnerIndex] = updatedGame;
          return newWinners
            .sort((a, b) => {
              const aTime = new Date(a.completedAt || a.updatedAt).getTime();
              const bTime = new Date(b.completedAt || b.updatedAt).getTime();
              return bTime - aTime;
            })
            .slice(0, recentWinnersLimit);
        } else {
          // Add new winner
          return [updatedGame, ...prevWinners]
            .sort((a, b) => {
              const aTime = new Date(a.completedAt || a.updatedAt).getTime();
              const bTime = new Date(b.completedAt || b.updatedAt).getTime();
              return bTime - aTime;
            })
            .slice(0, recentWinnersLimit);
        }
      });
    }

    // Update tournament progress when game status changes
    if (boardId) {
      graphqlScoringService.getTournamentProgress(boardId)
        .then(progress => {
          setTournamentProgress(progress);
        })
        .catch(err => {
          console.error('Error updating tournament progress:', err);
        });
    }
  }, [boardId, recentWinnersLimit]);

  /**
   * Set up real-time subscription using AWS AppSync
   */
  const setupSubscription = useCallback(() => {
    if (!enableRealtime || !boardId) return;

    try {
      // Use Amplify Data's observeQuery for real-time updates
      subscriptionRef.current = client.models.Game.observeQuery({
        filter: { boardId: { eq: boardId } }
      }).subscribe({
        next: async ({ items }) => {
          // Process each updated game
          for (const game of items) {
            // Transform the game data to match our interface
            let winnerSquare = null;
            
            if (game.winnerSquareId) {
              try {
                const squareResponse = await client.models.Square.get({ 
                  id: game.winnerSquareId 
                });
                
                if (squareResponse.data) {
                  let user = null;
                  if (squareResponse.data.userId) {
                    const userResponse = await client.models.User.get({ 
                      id: squareResponse.data.userId 
                    });
                    if (userResponse.data) {
                      user = {
                        id: userResponse.data.id,
                        displayName: userResponse.data.displayName,
                      };
                    }
                  }
                  
                  winnerSquare = {
                    id: squareResponse.data.id,
                    gridPosition: squareResponse.data.gridPosition,
                    winningTeamNumber: squareResponse.data.winningTeamNumber,
                    losingTeamNumber: squareResponse.data.losingTeamNumber,
                    user,
                  };
                }
              } catch (err) {
                console.error('Error fetching winner square details:', err);
              }
            }

            // Calculate payout based on round if board is available
            let payout = 0;
            if (board?.payoutStructure) {
              payout = graphqlScoringService.calculatePayout(game.round, board.payoutStructure);
            }

            const transformedGame: GraphQLGame = {
              id: game.id,
              boardId: game.boardId,
              gameNumber: game.gameNumber,
              round: game.round,
              team1: game.team1,
              team2: game.team2,
              team1Score: game.team1Score,
              team2Score: game.team2Score,
              status: game.status,
              winnerSquareId: game.winnerSquareId,
              scheduledTime: game.scheduledTime,
              completedAt: game.completedAt,
              createdAt: game.createdAt,
              updatedAt: game.updatedAt,
              winnerSquare,
              payout,
            };

            // Process the updated game
            handleGameUpdate(transformedGame);
          }
        },
        error: (error) => {
          console.error('Game subscription error:', error);
          setError(`Subscription error: ${error.message}`);
        }
      });
    } catch (err) {
      console.error('Error setting up game subscription:', err);
      setError(`Failed to set up real-time updates: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [boardId, enableRealtime, handleGameUpdate, board]);

  /**
   * Clean up subscription
   */
  const cleanupSubscription = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    
    if (realtimeTimeoutRef.current) {
      clearTimeout(realtimeTimeoutRef.current);
      realtimeTimeoutRef.current = null;
    }
  }, []);

  /**
   * Refetch data manually
   */
  const refetch = useCallback(async (): Promise<void> => {
    await fetchScoringData();
  }, [fetchScoringData]);

  /**
   * Clear error state
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchScoringData();
  }, [fetchScoringData]);

  // Set up real-time subscription
  useEffect(() => {
    setupSubscription();
    return cleanupSubscription;
  }, [setupSubscription, cleanupSubscription]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupSubscription();
    };
  }, [cleanupSubscription]);

  return {
    // Data
    board,
    games,
    recentWinners,
    tournamentProgress,
    
    // Loading states
    loading,
    error,
    
    // Real-time indicators
    realtimeUpdates,
    
    // Actions
    refetch,
    clearError,
  };
};