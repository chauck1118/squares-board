import React from 'react';
import { BoardDetail, Square, Game } from '../types/board';

interface SquaresGridProps {
  board: BoardDetail;
  userSquares: Square[];
  currentUserId: string | null;
  onSquareClick?: (position: number, square: Square | null) => void;
  highlightedSquares?: number[]; // Grid positions to highlight for real-time updates
  activeGames?: Game[]; // Current active games for score highlighting
  realtimeWinners?: Array<{ gameId: string; gridPosition: number; payout: number }>; // Real-time winner highlighting
}

const SquaresGrid: React.FC<SquaresGridProps> = ({ 
  board, 
  userSquares, 
  currentUserId: _currentUserId, 
  onSquareClick,
  highlightedSquares = [],
  activeGames = [],
  realtimeWinners = []
}) => {
  // Create a 10x10 grid (100 squares)
  const gridSquares = Array.from({ length: 100 }, (_, index) => {
    const square = board.squares.find(s => s.gridPosition === index);
    return {
      position: index,
      square: square || null,
      isUserSquare: square ? userSquares.some(us => us.id === square.id) : false,
    };
  });

  // Generate random numbers for axes (0-9) if board is assigned
  // Use board ID as seed for consistent randomization
  const generateRandomNumbers = (seed: string): number[] => {
    const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Fisher-Yates shuffle with seeded random
    for (let i = numbers.length - 1; i > 0; i--) {
      hash = (hash * 1103515245 + 12345) & 0x7fffffff;
      const j = hash % (i + 1);
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    
    return numbers;
  };

  const isAssigned = board.status === 'ASSIGNED' || board.status === 'ACTIVE' || board.status === 'COMPLETED';
  const topNumbers = isAssigned ? generateRandomNumbers(`${board.id}-top`) : null;
  const leftNumbers = isAssigned ? generateRandomNumbers(`${board.id}-left`) : null;

  // Check if a square is currently winning based on active games
  const isWinningSquare = (gridSquare: typeof gridSquares[0]): boolean => {
    if (!gridSquare.square || !isAssigned || !topNumbers || !leftNumbers) return false;
    
    const position = gridSquare.position;
    const row = Math.floor(position / 10);
    const col = position % 10;
    const winningNumber = topNumbers[col];
    const losingNumber = leftNumbers[row];
    
    // Check real-time winners first
    const isRealtimeWinner = realtimeWinners.some(winner => winner.gridPosition === position);
    if (isRealtimeWinner) return true;
    
    return activeGames.some(game => {
      if (game.status !== 'COMPLETED' || !game.team1Score || !game.team2Score) return false;
      const team1LastDigit = game.team1Score % 10;
      const team2LastDigit = game.team2Score % 10;
      return winningNumber === team1LastDigit && losingNumber === team2LastDigit;
    });
  };

  const getSquareClass = (gridSquare: typeof gridSquares[0]): string => {
    const baseClass = "w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 border border-gray-300 flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer touch-manipulation min-h-[32px] min-w-[32px] select-none";
    
    // Check for real-time highlighting
    const isHighlighted = highlightedSquares.includes(gridSquare.position);
    const isWinner = isWinningSquare(gridSquare);
    
    if (!gridSquare.square) {
      if (isHighlighted) {
        return `${baseClass} bg-blue-200 text-gray-600 hover:bg-blue-300 active:bg-blue-400 animate-pulse`;
      }
      return `${baseClass} bg-gray-100 text-gray-400 hover:bg-gray-200 active:bg-gray-300`;
    }

    // Winner highlighting takes precedence
    if (isWinner) {
      return `${baseClass} bg-yellow-400 text-yellow-900 hover:bg-yellow-500 active:bg-yellow-600 shadow-lg ring-2 ring-yellow-300 animate-pulse`;
    }

    if (gridSquare.isUserSquare) {
      if (gridSquare.square.paymentStatus === 'PAID') {
        if (isHighlighted) {
          return `${baseClass} bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-lg ring-2 ring-blue-300 animate-pulse`;
        }
        return `${baseClass} bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 shadow-md`;
      } else {
        if (isHighlighted) {
          return `${baseClass} bg-blue-300 text-blue-900 hover:bg-blue-400 active:bg-blue-500 animate-pulse`;
        }
        return `${baseClass} bg-blue-200 text-blue-800 hover:bg-blue-300 active:bg-blue-400`;
      }
    }

    if (gridSquare.square.paymentStatus === 'PAID') {
      if (isHighlighted) {
        return `${baseClass} bg-green-200 text-green-900 hover:bg-green-300 active:bg-green-400 animate-pulse`;
      }
      return `${baseClass} bg-green-100 text-green-800 hover:bg-green-200 active:bg-green-300`;
    } else {
      if (isHighlighted) {
        return `${baseClass} bg-yellow-200 text-yellow-900 hover:bg-yellow-300 active:bg-yellow-400 animate-pulse`;
      }
      return `${baseClass} bg-yellow-100 text-yellow-800 hover:bg-yellow-200 active:bg-yellow-300`;
    }
  };

  const getSquareContent = (gridSquare: typeof gridSquares[0]): string => {
    if (!gridSquare.square) {
      return '';
    }

    if (board.status === 'OPEN' || board.status === 'FILLED') {
      // Show initials or payment status
      if (gridSquare.square.user?.displayName) {
        const initials = gridSquare.square.user.displayName
          .split(' ')
          .map(name => name.charAt(0))
          .join('')
          .toUpperCase()
          .slice(0, 2);
        return initials;
      }
      return gridSquare.square.paymentStatus === 'PAID' ? 'P' : '?';
    }

    // For assigned boards, show the square number or user initials
    if (gridSquare.square.user?.displayName) {
      const initials = gridSquare.square.user.displayName
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
      return initials;
    }

    return String(gridSquare.position + 1);
  };

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Top numbers row */}
        {topNumbers && (
          <div className="flex mb-1">
            <div className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12"></div> {/* Empty corner */}
            {topNumbers.map((num, index) => (
              <div
                key={`top-${index}`}
                className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center text-xs sm:text-sm md:text-base font-bold text-gray-700 bg-gray-200 border border-gray-400"
              >
                {num}
              </div>
            ))}
          </div>
        )}

        {/* Grid rows */}
        {Array.from({ length: 10 }, (_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex mb-1">
            {/* Left number */}
            {leftNumbers && (
              <div className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center text-xs sm:text-sm md:text-base font-bold text-gray-700 bg-gray-200 border border-gray-400 mr-1">
                {leftNumbers[rowIndex]}
              </div>
            )}
            
            {/* Row squares */}
            {Array.from({ length: 10 }, (_, colIndex) => {
              const position = rowIndex * 10 + colIndex;
              const gridSquare = gridSquares[position];
              
              return (
                <div
                  key={`square-${position}`}
                  className={getSquareClass(gridSquare)}
                  title={
                    gridSquare.square
                      ? `${gridSquare.square.user?.displayName || 'Unknown'} - ${gridSquare.square.paymentStatus}`
                      : 'Available'
                  }
                  onClick={() => onSquareClick?.(position, gridSquare.square)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSquareClick?.(position, gridSquare.square);
                    }
                  }}
                  aria-label={
                    gridSquare.square
                      ? `Square ${position + 1}: ${gridSquare.square.user?.displayName || 'Unknown'} - ${gridSquare.square.paymentStatus}`
                      : `Square ${position + 1}: Available`
                  }
                >
                  {getSquareContent(gridSquare)}
                </div>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 mr-2"></div>
            <span className="text-gray-600">Available</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-100 border border-gray-300 mr-2"></div>
            <span className="text-gray-600">Pending Payment</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-100 border border-gray-300 mr-2"></div>
            <span className="text-gray-600">Paid</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500 border border-gray-300 mr-2"></div>
            <span className="text-gray-600">Your Squares</span>
          </div>
        </div>

        {/* Grid explanation */}
        <div className="mt-4 p-4 bg-gray-50 rounded-md">
          <h4 className="font-medium text-gray-900 mb-2">How the Grid Works</h4>
          <div className="text-sm text-gray-600 space-y-1">
            {board.status === 'OPEN' || board.status === 'FILLED' ? (
              <>
                <p>• Squares show user initials or payment status</p>
                <p>• Grid positions and numbers will be randomly assigned when the board is full</p>
                <p>• Winners are determined by the last digit of each team's final score</p>
              </>
            ) : (
              <>
                <p>• Numbers across the top represent the winning team's score (last digit)</p>
                <p>• Numbers down the left represent the losing team's score (last digit)</p>
                <p>• Winners are determined by where these numbers intersect on the grid</p>
                <p>• Example: If the final score is 78-65, the winner is at column 8, row 5</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SquaresGrid;