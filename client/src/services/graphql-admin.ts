import { client } from './amplify-client';
import { BoardStatus, PaymentStatus, GameStatus } from '../types/amplify-models';

/**
 * GraphQL operations for admin functionality
 */

/**
 * Get all boards for admin dashboard
 */
export const listAllBoards = async () => {
  return client.models.Board.list({
    sort: (s) => s.createdAt('DESC'),
  });
};

/**
 * Get board details with payment status information
 */
export const getBoardWithPaymentStatus = async (boardId: string) => {
  // Get the board
  const board = await client.models.Board.get({ id: boardId });
  
  if (!board) {
    throw new Error('Board not found');
  }
  
  // Get all squares for this board
  const squares = await client.models.Square.list({
    filter: { boardId: { eq: boardId } },
  });
  
  // Group squares by user
  const squaresByUser = new Map<string, any>();
  
  for (const square of squares.data) {
    if (square.userId) {
      if (!squaresByUser.has(square.userId)) {
        // Get user details
        const user = await client.models.User.get({ id: square.userId });
        
        squaresByUser.set(square.userId, {
          user: {
            id: square.userId,
            displayName: user?.displayName || 'Unknown User',
          },
          squares: [],
          paidCount: 0,
          pendingCount: 0,
        });
      }
      
      const userEntry = squaresByUser.get(square.userId);
      userEntry.squares.push({
        id: square.id,
        paymentStatus: square.paymentStatus,
        gridPosition: square.gridPosition,
        createdAt: square.createdAt,
      });
      
      if (square.paymentStatus === PaymentStatus.PAID) {
        userEntry.paidCount++;
      } else {
        userEntry.pendingCount++;
      }
    }
  }
  
  // Calculate payment stats
  const totalSquares = squares.data.length;
  const paidSquares = squares.data.filter(s => s.paymentStatus === PaymentStatus.PAID).length;
  const pendingSquares = totalSquares - paidSquares;
  
  return {
    board: {
      id: board.id,
      name: board.name,
      status: board.status,
      pricePerSquare: board.pricePerSquare,
    },
    paymentStats: {
      totalSquares,
      paidSquares,
      pendingSquares,
    },
    squaresByUser: Array.from(squaresByUser.values()),
  };
};

/**
 * Update square payment status
 */
export const updateSquarePayment = async (squareId: string, paymentStatus: PaymentStatus) => {
  const square = await client.models.Square.get({ id: squareId });
  
  if (!square) {
    throw new Error('Square not found');
  }
  
  const updatedSquare = await client.models.Square.update({
    id: squareId,
    paymentStatus,
  });
  
  // Update board payment stats
  if (updatedSquare.boardId) {
    const board = await client.models.Board.get({ id: updatedSquare.boardId });
    
    if (board) {
      const allSquares = await client.models.Square.list({
        filter: { boardId: { eq: updatedSquare.boardId } },
      });
      
      const paidSquares = allSquares.data.filter(s => s.paymentStatus === PaymentStatus.PAID).length;
      
      await client.models.Board.update({
        id: board.id,
        paidSquares,
      });
    }
  }
  
  return updatedSquare;
};

/**
 * Trigger board assignment
 */
export const triggerBoardAssignment = async (boardId: string) => {
  const board = await client.models.Board.get({ id: boardId });
  
  if (!board) {
    throw new Error('Board not found');
  }
  
  if (board.paidSquares < 100) {
    throw new Error('Cannot assign positions until all 100 squares are paid');
  }
  
  if (![BoardStatus.OPEN, BoardStatus.FILLED].includes(board.status as BoardStatus)) {
    throw new Error(`Cannot assign positions for board in ${board.status} status`);
  }
  
  // Generate random numbers for winning and losing teams (0-9)
  const winningNumbers = shuffleArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const losingNumbers = shuffleArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  
  // Update board with random numbers
  await client.models.Board.update({
    id: boardId,
    status: BoardStatus.ASSIGNED,
    winningTeamNumbers: winningNumbers,
    losingTeamNumbers: losingNumbers,
  });
  
  // Get all squares for this board
  const squares = await client.models.Square.list({
    filter: { boardId: { eq: boardId } },
  });
  
  // Assign grid positions (0-99) randomly
  const positions = shuffleArray(Array.from({ length: 100 }, (_, i) => i));
  
  // Update each square with its position and team numbers
  for (let i = 0; i < squares.data.length; i++) {
    const square = squares.data[i];
    const position = positions[i];
    const row = Math.floor(position / 10);
    const col = position % 10;
    
    await client.models.Square.update({
      id: square.id,
      gridPosition: position,
      winningTeamNumber: winningNumbers[col],
      losingTeamNumber: losingNumbers[row],
    });
  }
  
  return {
    message: 'Board assignment completed successfully',
    assignedSquares: squares.data.length,
    winningNumbers,
    losingNumbers,
  };
};

/**
 * Validate board assignments
 */
export const validateBoardAssignments = async (boardId: string) => {
  const board = await client.models.Board.get({ id: boardId });
  
  if (!board) {
    throw new Error('Board not found');
  }
  
  const squares = await client.models.Square.list({
    filter: { boardId: { eq: boardId } },
  });
  
  const errors: string[] = [];
  const positions = new Set<number>();
  let invalidPositions = 0;
  let duplicatePositions = 0;
  
  for (const square of squares.data) {
    // Check if position is valid (0-99)
    if (square.gridPosition === null || square.gridPosition < 0 || square.gridPosition > 99) {
      errors.push(`Square ${square.id} has invalid position: ${square.gridPosition}`);
      invalidPositions++;
      continue;
    }
    
    // Check for duplicate positions
    if (positions.has(square.gridPosition)) {
      errors.push(`Duplicate position ${square.gridPosition} found`);
      duplicatePositions++;
    } else {
      positions.add(square.gridPosition);
    }
    
    // Check if team numbers are valid (0-9)
    if (square.winningTeamNumber === null || square.winningTeamNumber < 0 || square.winningTeamNumber > 9) {
      errors.push(`Square ${square.id} has invalid winning team number: ${square.winningTeamNumber}`);
    }
    
    if (square.losingTeamNumber === null || square.losingTeamNumber < 0 || square.losingTeamNumber > 9) {
      errors.push(`Square ${square.id} has invalid losing team number: ${square.losingTeamNumber}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    stats: {
      totalSquares: squares.data.length,
      assignedSquares: positions.size,
      duplicatePositions,
      invalidPositions,
    },
  };
};

/**
 * Create a new board
 */
export const createBoard = async (boardData: {
  name: string;
  pricePerSquare: number;
  payoutStructure: {
    round1: number;
    round2: number;
    sweet16: number;
    elite8: number;
    final4: number;
    championship: number;
  };
}) => {
  const { name, pricePerSquare, payoutStructure } = boardData;
  
  // Get current user ID
  const currentUser = await client.models.User.get({ id: 'current' });
  
  if (!currentUser) {
    throw new Error('User not authenticated');
  }
  
  const board = await client.models.Board.create({
    name,
    pricePerSquare,
    status: BoardStatus.OPEN,
    totalSquares: 100,
    claimedSquares: 0,
    paidSquares: 0,
    createdBy: currentUser.id,
    payoutStructure,
  });
  
  return {
    message: 'Board created successfully',
    board,
  };
};

/**
 * Helper function to shuffle an array
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}