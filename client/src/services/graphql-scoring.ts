import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

// Create Amplify Data client for GraphQL operations
const client = generateClient<Schema>();

export interface GraphQLGame {
  id: string;
  boardId: string;
  gameNumber: number;
  round: 'ROUND1' | 'ROUND2' | 'SWEET16' | 'ELITE8' | 'FINAL4' | 'CHAMPIONSHIP';
  team1: string;
  team2: string;
  team1Score?: number | null;
  team2Score?: number | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  winnerSquareId?: string | null;
  scheduledTime: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  winnerSquare?: {
    id: string;
    gridPosition?: number | null;
    winningTeamNumber?: number | null;
    losingTeamNumber?: number | null;
    user?: {
      id: string;
      displayName: string;
    } | null;
  } | null;
  payout?: number;
}

export interface GraphQLBoard {
  id: string;
  name: string;
  status: 'OPEN' | 'FILLED' | 'ASSIGNED' | 'ACTIVE' | 'COMPLETED';
  payoutStructure?: {
    round1: number;
    round2: number;
    sweet16: number;
    elite8: number;
    final4: number;
    championship: number;
  } | null;
}

export interface ScoringData {
  board: GraphQLBoard;
  games: GraphQLGame[];
}

/**
 * GraphQL service for scoring and winner data operations
 */
export class GraphQLScoringService {
  /**
   * Get board scoring data with games
   */
  async getBoardScoring(boardId: string): Promise<ScoringData> {
    try {
      // Get board details with optimized query
      const boardResponse = await client.models.Board.get({ id: boardId });
      
      if (!boardResponse.data) {
        throw new Error(`Board with ID ${boardId} not found`);
      }

      // Get games for the board with optimized query including related data
      const gamesResponse = await client.models.Game.list({
        filter: { boardId: { eq: boardId } },
        selectionSet: ['*', {
          winnerSquare: ['*', {
            user: ['id', 'displayName']
          }]
        }]
      });

      // Transform the data to match our interface
      const board: GraphQLBoard = {
        id: boardResponse.data.id,
        name: boardResponse.data.name,
        status: boardResponse.data.status,
        payoutStructure: boardResponse.data.payoutStructure ? 
          JSON.parse(boardResponse.data.payoutStructure as string) : null,
      };

      const games: GraphQLGame[] = (gamesResponse.data || []).map((game) => {
        // Extract winner square data if available
        let winnerSquare = null;
        if (game.winnerSquare) {
          winnerSquare = {
            id: game.winnerSquare.id,
            gridPosition: game.winnerSquare.gridPosition,
            winningTeamNumber: game.winnerSquare.winningTeamNumber,
            losingTeamNumber: game.winnerSquare.losingTeamNumber,
            user: game.winnerSquare.user ? {
              id: game.winnerSquare.user.id,
              displayName: game.winnerSquare.user.displayName,
            } : null,
          };
        }

        // Calculate payout based on round
        const payout = board.payoutStructure ? this.calculatePayout(game.round, board.payoutStructure) : 0;

        return {
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
      });

      // Sort games by game number
      games.sort((a, b) => a.gameNumber - b.gameNumber);

      return { board, games };
    } catch (error) {
      console.error('Error fetching board scoring data:', error);
      throw new Error('Failed to fetch scoring data');
    }
  }

  /**
   * Get recent winners (completed games with winners)
   */
  async getRecentWinners(boardId: string, limit: number = 5): Promise<GraphQLGame[]> {
    try {
      // Use optimized query to get completed games with winners in a single request
      const gamesResponse = await client.models.Game.list({
        filter: { 
          and: [
            { boardId: { eq: boardId } },
            { status: { eq: 'COMPLETED' } },
            { winnerSquareId: { ne: null } }
          ]
        },
        selectionSet: ['*', {
          winnerSquare: ['*', {
            user: ['id', 'displayName']
          }]
        }]
      });

      // Get board for payout calculation
      const boardResponse = await client.models.Board.get({ id: boardId });
      const payoutStructure = boardResponse.data?.payoutStructure ? 
        JSON.parse(boardResponse.data.payoutStructure as string) : null;

      const games = (gamesResponse.data || []).map((game) => {
        // Extract winner square data if available
        let winnerSquare = null;
        if (game.winnerSquare) {
          winnerSquare = {
            id: game.winnerSquare.id,
            gridPosition: game.winnerSquare.gridPosition,
            winningTeamNumber: game.winnerSquare.winningTeamNumber,
            losingTeamNumber: game.winnerSquare.losingTeamNumber,
            user: game.winnerSquare.user ? {
              id: game.winnerSquare.user.id,
              displayName: game.winnerSquare.user.displayName,
            } : null,
          };
        }

        // Calculate payout based on round
        const payout = payoutStructure ? this.calculatePayout(game.round, payoutStructure) : 0;

        return {
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
      });

      // Sort by completion time (most recent first) and limit results
      return games
        .sort((a, b) => {
          const aTime = new Date(a.completedAt || a.updatedAt).getTime();
          const bTime = new Date(b.completedAt || b.updatedAt).getTime();
          return bTime - aTime;
        })
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching recent winners:', error);
      throw new Error('Failed to fetch recent winners');
    }
  }

  /**
   * Subscribe to game score updates for real-time updates
   * This method is now handled directly in useScoringRealtime hook
   * for better integration with AWS AppSync subscriptions
   */
  subscribeToGameUpdates(boardId: string, callback: (game: GraphQLGame) => void) {
    const subscription = client.models.Game.observeQuery({
      filter: { boardId: { eq: boardId } },
      selectionSet: ['*', {
        winnerSquare: ['*', {
          user: ['id', 'displayName']
        }]
      }]
    }).subscribe({
      next: async ({ items }) => {
        // Process updated games and call callback for each
        for (const game of items) {
          // Extract winner square data if available
          let winnerSquare = null;
          if (game.winnerSquare) {
            winnerSquare = {
              id: game.winnerSquare.id,
              gridPosition: game.winnerSquare.gridPosition,
              winningTeamNumber: game.winnerSquare.winningTeamNumber,
              losingTeamNumber: game.winnerSquare.losingTeamNumber,
              user: game.winnerSquare.user ? {
                id: game.winnerSquare.user.id,
                displayName: game.winnerSquare.user.displayName,
              } : null,
            };
          }

          // Get board for payout calculation if needed
          let payout = 0;
          try {
            const boardResponse = await client.models.Board.get({ id: game.boardId });
            if (boardResponse.data?.payoutStructure) {
              const payoutStructure = JSON.parse(boardResponse.data.payoutStructure as string);
              payout = this.calculatePayout(game.round, payoutStructure);
            }
          } catch (err) {
            console.error('Error fetching board for payout calculation:', err);
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

          callback(transformedGame);
        }
      },
      error: (error) => {
        console.error('Game subscription error:', error);
      }
    });

    return subscription;
  }

  /**
   * Calculate payout for a game based on round
   */
  calculatePayout(round: string, payoutStructure: GraphQLBoard['payoutStructure']): number {
    if (!payoutStructure) return 0;

    const roundPayouts: Record<string, number> = {
      'ROUND1': payoutStructure.round1,
      'ROUND2': payoutStructure.round2,
      'SWEET16': payoutStructure.sweet16,
      'ELITE8': payoutStructure.elite8,
      'FINAL4': payoutStructure.final4,
      'CHAMPIONSHIP': payoutStructure.championship,
    };

    return roundPayouts[round] || 0;
  }

  /**
   * Convert GraphQL round enum to display string
   */
  formatRoundName(round: string): string {
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

  /**
   * Get tournament round progression data
   * Returns information about the current state of the tournament
   */
  async getTournamentProgress(boardId: string): Promise<{
    currentRound: string;
    completedRounds: string[];
    upcomingRounds: string[];
    roundStats: Record<string, { total: number; completed: number; inProgress: number; scheduled: number }>;
  }> {
    try {
      // Get games for the board with optimized query
      const gamesResponse = await client.models.Game.list({
        filter: { boardId: { eq: boardId } },
        selectionSet: ['id', 'round', 'status']
      });

      const games = gamesResponse.data || [];
      
      // Define all tournament rounds in order
      const allRounds = ['ROUND1', 'ROUND2', 'SWEET16', 'ELITE8', 'FINAL4', 'CHAMPIONSHIP'];
      
      // Initialize round statistics
      const roundStats: Record<string, { 
        total: number; 
        completed: number; 
        inProgress: number; 
        scheduled: number 
      }> = {};
      
      // Initialize with all rounds
      allRounds.forEach(round => {
        roundStats[round] = { total: 0, completed: 0, inProgress: 0, scheduled: 0 };
      });
      
      // Count games by round and status
      games.forEach(game => {
        if (!roundStats[game.round]) {
          roundStats[game.round] = { total: 0, completed: 0, inProgress: 0, scheduled: 0 };
        }
        
        roundStats[game.round].total++;
        
        if (game.status === 'COMPLETED') {
          roundStats[game.round].completed++;
        } else if (game.status === 'IN_PROGRESS') {
          roundStats[game.round].inProgress++;
        } else {
          roundStats[game.round].scheduled++;
        }
      });
      
      // Determine completed, current, and upcoming rounds
      const completedRounds: string[] = [];
      let currentRound: string = allRounds[0];
      const upcomingRounds: string[] = [];
      
      let foundCurrent = false;
      
      for (const round of allRounds) {
        if (!roundStats[round] || roundStats[round].total === 0) {
          // Skip rounds with no games
          continue;
        }
        
        if (roundStats[round].completed === roundStats[round].total) {
          // All games in this round are completed
          completedRounds.push(round);
        } else if (!foundCurrent) {
          // First non-completed round is the current round
          currentRound = round;
          foundCurrent = true;
        } else {
          // Rounds after the current round are upcoming
          upcomingRounds.push(round);
        }
      }
      
      return {
        currentRound,
        completedRounds,
        upcomingRounds,
        roundStats
      };
    } catch (error) {
      console.error('Error fetching tournament progress:', error);
      throw new Error('Failed to fetch tournament progress data');
    }
  }
}

export const graphqlScoringService = new GraphQLScoringService();