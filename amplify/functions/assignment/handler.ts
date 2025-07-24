import type { Handler } from 'aws-lambda';

interface AssignmentEvent {
  boardId: string;
  squares: Array<{
    id: string;
    userId: string;
    claimOrder: number;
  }>;
}

interface AssignmentResult {
  success: boolean;
  assignments?: Array<{
    squareId: string;
    gridPosition: number;
    winningTeamNumber: number;
    losingTeamNumber: number;
  }>;
  error?: string;
}

/**
 * Fisher-Yates shuffle algorithm for unbiased randomization
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate random assignments for squares
 */
function generateRandomAssignments(squares: AssignmentEvent['squares']): AssignmentResult['assignments'] {
  // Create arrays for grid positions (0-99) and numbers (0-9)
  const gridPositions = Array.from({ length: 100 }, (_, i) => i);
  const winningNumbers = Array.from({ length: 10 }, (_, i) => i);
  const losingNumbers = Array.from({ length: 10 }, (_, i) => i);

  // Shuffle all arrays using Fisher-Yates
  const shuffledPositions = shuffleArray(gridPositions);
  const shuffledWinningNumbers = shuffleArray(winningNumbers);
  const shuffledLosingNumbers = shuffleArray(losingNumbers);

  // Sort squares by claim order to ensure consistent assignment
  const sortedSquares = [...squares].sort((a, b) => a.claimOrder - b.claimOrder);

  return sortedSquares.map((square, index) => {
    const gridPosition = shuffledPositions[index];
    const row = Math.floor(gridPosition / 10);
    const col = gridPosition % 10;

    return {
      squareId: square.id,
      gridPosition,
      winningTeamNumber: shuffledWinningNumbers[col],
      losingTeamNumber: shuffledLosingNumbers[row],
    };
  });
}

export const handler: Handler<AssignmentEvent, AssignmentResult> = async (event): Promise<AssignmentResult> => {
  try {
    console.log('Assignment function triggered for board:', event.boardId);
    console.log('Number of squares to assign:', event.squares.length);

    // Validate input
    if (!event.boardId || !event.squares || event.squares.length === 0) {
      return {
        success: false,
        error: 'Invalid input: boardId and squares are required',
      };
    }

    if (event.squares.length > 100) {
      return {
        success: false,
        error: 'Cannot assign more than 100 squares',
      };
    }

    // Generate random assignments
    const assignments = generateRandomAssignments(event.squares);

    console.log('Generated assignments:', assignments?.length || 0);

    return {
      success: true,
      assignments,
    };
  } catch (error) {
    console.error('Assignment function error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};