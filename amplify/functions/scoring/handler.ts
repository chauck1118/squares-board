import type { Handler } from 'aws-lambda';

interface ScoringEvent {
  gameId: string;
  boardId: string;
  team1Score: number;
  team2Score: number;
  round: 'ROUND1' | 'ROUND2' | 'SWEET16' | 'ELITE8' | 'FINAL4' | 'CHAMPIONSHIP';
  squares: Array<{
    id: string;
    userId: string;
    winningTeamNumber: number;
    losingTeamNumber: number;
  }>;
}

interface ScoringResult {
  success: boolean;
  winnerSquareId?: string;
  winnerUserId?: string;
  payout?: number;
  winningNumbers?: {
    team1LastDigit: number;
    team2LastDigit: number;
  };
  error?: string;
}

/**
 * Calculate payout based on tournament round
 */
function calculatePayout(round: ScoringEvent['round'], pricePerSquare: number = 10): number {
  const payoutMultipliers = {
    ROUND1: 2.5,        // $25 for $10 squares
    ROUND2: 5,          // $50 for $10 squares
    SWEET16: 10,        // $100 for $10 squares
    ELITE8: 20,         // $200 for $10 squares
    FINAL4: 35,         // $350 for $10 squares
    CHAMPIONSHIP: 50,   // $500 for $10 squares
  };

  return pricePerSquare * payoutMultipliers[round];
}

/**
 * Find winning square based on final score digits
 */
function findWinningSquare(
  team1Score: number,
  team2Score: number,
  squares: ScoringEvent['squares']
): { square: ScoringEvent['squares'][0] | null; winningNumbers: { team1LastDigit: number; team2LastDigit: number } } {
  const team1LastDigit = team1Score % 10;
  const team2LastDigit = team2Score % 10;

  const winningSquare = squares.find(
    (square) =>
      square.winningTeamNumber === team1LastDigit &&
      square.losingTeamNumber === team2LastDigit
  );

  return {
    square: winningSquare || null,
    winningNumbers: { team1LastDigit, team2LastDigit },
  };
}

export const handler: Handler<ScoringEvent, ScoringResult> = async (event): Promise<ScoringResult> => {
  try {
    console.log('Scoring function triggered for game:', event.gameId);
    console.log('Final scores:', event.team1Score, 'vs', event.team2Score);

    // Validate input
    if (!event.gameId || !event.boardId || event.team1Score == null || event.team2Score == null) {
      return {
        success: false,
        error: 'Invalid input: gameId, boardId, and scores are required',
      };
    }

    if (event.team1Score < 0 || event.team2Score < 0) {
      return {
        success: false,
        error: 'Scores cannot be negative',
      };
    }

    if (!event.squares || event.squares.length === 0) {
      return {
        success: false,
        error: 'No squares provided for scoring',
      };
    }

    // Find winning square based on last digits of scores
    const { square: winningSquare, winningNumbers } = findWinningSquare(
      event.team1Score,
      event.team2Score,
      event.squares
    );

    if (!winningSquare) {
      console.log('No winning square found for digits:', winningNumbers);
      return {
        success: true,
        winningNumbers,
        // No winner for this combination
      };
    }

    // Calculate payout for the round
    const payout = calculatePayout(event.round);

    console.log('Winner found:', winningSquare.userId, 'Payout:', payout);

    return {
      success: true,
      winnerSquareId: winningSquare.id,
      winnerUserId: winningSquare.userId,
      payout,
      winningNumbers,
    };
  } catch (error) {
    console.error('Scoring function error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};