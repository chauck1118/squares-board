import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { BoardDetail as BoardDetailType, Square, Game } from '../types/board';
import { useAuth } from '../contexts/AuthContext';
import { useBoardRealtime } from '../hooks/useBoardRealtime';
import SquareClaimModal from './SquareClaimModal';
import SquaresGrid from './SquaresGrid';
import ScoringTable from './ScoringTable';
import WinnerDisplay from './WinnerDisplay';
import RealtimeNotifications from './RealtimeNotifications';

const BoardDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [board, setBoard] = useState<BoardDetailType | null>(null);
  const [scoringGames, setScoringGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [realtimeWinners, setRealtimeWinners] = useState<Array<{ gameId: string; gridPosition: number; payout: number }>>([]);
  const [highlightedSquares, setHighlightedSquares] = useState<number[]>([]);
  const [realtimeGameUpdates, setRealtimeGameUpdates] = useState<string[]>([]);

  // Real-time event handlers
  const handleScoreUpdate = useCallback((game: Game) => {
    setScoringGames(prev => {
      const updated = prev.map(g => g.id === game.id ? game : g);
      if (!updated.find(g => g.id === game.id)) {
        updated.push(game);
      }
      return updated.sort((a, b) => a.gameNumber - b.gameNumber);
    });
    
    // Track real-time game updates for visual indicators
    setRealtimeGameUpdates(prev => {
      if (!prev.includes(game.id)) {
        return [...prev, game.id];
      }
      return prev;
    });
    
    // Remove the real-time indicator after 30 seconds
    setTimeout(() => {
      setRealtimeGameUpdates(prev => prev.filter(id => id !== game.id));
    }, 30000);
  }, []);

  const handleSquareClaimed = useCallback((square: Square) => {
    if (!board) return;
    
    setBoard(prev => {
      if (!prev) return prev;
      
      const updatedSquares = [...prev.squares];
      const existingIndex = updatedSquares.findIndex(s => s.id === square.id);
      
      if (existingIndex >= 0) {
        updatedSquares[existingIndex] = square;
      } else {
        updatedSquares.push(square);
      }
      
      return {
        ...prev,
        squares: updatedSquares,
        claimedSquares: updatedSquares.filter(s => s.userId).length,
        paidSquares: updatedSquares.filter(s => s.paymentStatus === 'PAID').length
      };
    });
  }, [board]);

  const handlePaymentConfirmed = useCallback((square: Square) => {
    if (!board) return;
    
    setBoard(prev => {
      if (!prev) return prev;
      
      const updatedSquares = prev.squares.map(s => 
        s.id === square.id ? { ...s, paymentStatus: 'PAID' } : s
      );
      
      return {
        ...prev,
        squares: updatedSquares,
        paidSquares: updatedSquares.filter(s => s.paymentStatus === 'PAID').length
      };
    });
  }, [board]);

  const handleBoardAssigned = useCallback(() => {
    // Refresh board data when assignment happens
    if (id) {
      apiService.getBoardDetail(id).then(response => {
        setBoard(response.board);
      }).catch(console.error);
    }
  }, [id]);

  const handleWinnerAnnounced = useCallback((winner: any) => {
    // Update the specific game with winner information
    setScoringGames(prev => 
      prev.map(game => 
        game.id === winner.game?.id 
          ? { ...game, winnerSquare: winner.square, payout: winner.payout }
          : game
      )
    );
    
    // Add to real-time winners for grid highlighting
    if (winner.square?.gridPosition !== undefined) {
      setRealtimeWinners(prev => {
        const existing = prev.find(w => w.gameId === winner.game?.id);
        if (existing) return prev;
        
        return [...prev, {
          gameId: winner.game?.id || '',
          gridPosition: winner.square.gridPosition,
          payout: winner.payout || 0
        }];
      });
      
      // Temporarily highlight the winning square
      setHighlightedSquares(prev => {
        if (!prev.includes(winner.square.gridPosition)) {
          return [...prev, winner.square.gridPosition];
        }
        return prev;
      });
      
      // Remove highlight after 10 seconds
      setTimeout(() => {
        setHighlightedSquares(prev => prev.filter(pos => pos !== winner.square.gridPosition));
      }, 10000);
    }
  }, []);

  // Set up real-time integration
  const { notifications, clearNotifications, removeNotification } = useBoardRealtime({
    boardId: id || '',
    onScoreUpdate: handleScoreUpdate,
    onSquareClaimed: handleSquareClaimed,
    onPaymentConfirmed: handlePaymentConfirmed,
    onBoardAssigned: handleBoardAssigned,
    onWinnerAnnounced: handleWinnerAnnounced
  });

  useEffect(() => {
    if (!id) return;

    const fetchBoardData = async () => {
      try {
        setLoading(true);
        
        // Fetch board details
        const boardResponse = await apiService.getBoardDetail(id);
        setBoard(boardResponse.board);
        
        // Fetch scoring data if board is active or completed
        if (['ACTIVE', 'COMPLETED'].includes(boardResponse.board.status)) {
          try {
            const scoringResponse = await apiService.getBoardScoring(id);
            setScoringGames(scoringResponse.scoringTable.games);
          } catch (scoringErr) {
            console.error('Error fetching scoring data:', scoringErr);
            // Don't fail the whole page if scoring data fails
            setScoringGames([]);
          }
        }
        
        setError(null);
      } catch (err: any) {
        console.error('Error fetching board:', err);
        setError(err.response?.data?.error?.message || 'Failed to load board details');
      } finally {
        setLoading(false);
      }
    };

    fetchBoardData();
  }, [id]);

  const handleClaimSquares = async (numberOfSquares: number) => {
    if (!board || !id) return;

    try {
      setClaiming(true);
      await apiService.claimSquares(id, { numberOfSquares });
      
      // Refresh board data
      const response = await apiService.getBoardDetail(id);
      setBoard(response.board);
      setShowClaimModal(false);
    } catch (err: any) {
      console.error('Error claiming squares:', err);
      throw new Error(err.response?.data?.error?.message || 'Failed to claim squares');
    } finally {
      setClaiming(false);
    }
  };

  const getUserSquares = (): Square[] => {
    if (!board || !user) return [];
    return board.squares.filter(square => square.userId === user.id);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'OPEN':
        return 'bg-green-100 text-green-800';
      case 'FILLED':
        return 'bg-yellow-100 text-yellow-800';
      case 'ASSIGNED':
        return 'bg-blue-100 text-blue-800';
      case 'ACTIVE':
        return 'bg-purple-100 text-purple-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'OPEN':
        return 'Open for Registration';
      case 'FILLED':
        return 'Filled - Awaiting Assignment';
      case 'ASSIGNED':
        return 'Squares Assigned';
      case 'ACTIVE':
        return 'Tournament Active';
      case 'COMPLETED':
        return 'Tournament Completed';
      default:
        return status;
    }
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading board</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error || 'Board not found'}</p>
                </div>
                <div className="mt-4">
                  <Link
                    to="/dashboard"
                    className="text-sm font-medium text-red-800 hover:text-red-700"
                  >
                    ← Back to boards
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const userSquares = getUserSquares();
  const canClaimSquares = board.status === 'OPEN' && userSquares.length < 10;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4 touch-manipulation"
          >
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Back to boards
          </Link>
          
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">{board.name}</h1>
              <div className="mt-3 flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(board.status)} w-fit`}>
                  {getStatusText(board.status)}
                </span>
                <span className="text-sm text-gray-500">
                  {formatPrice(board.pricePerSquare)} per square
                </span>
              </div>
            </div>
            
            {canClaimSquares && (
              <div className="flex-shrink-0">
                <button
                  onClick={() => setShowClaimModal(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 sm:px-4 sm:py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 touch-manipulation"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Claim Squares
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{board.claimedSquares}</div>
            <div className="text-xs sm:text-sm text-gray-500">Squares Claimed</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{board.paidSquares}</div>
            <div className="text-xs sm:text-sm text-gray-500">Squares Paid</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{userSquares.length}</div>
            <div className="text-xs sm:text-sm text-gray-500">Your Squares</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">
              {userSquares.filter(s => s.paymentStatus === 'PAID').length}
            </div>
            <div className="text-xs sm:text-sm text-gray-500">Your Paid Squares</div>
          </div>
        </div>

        {/* User's squares info */}
        {userSquares.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Your Squares</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    You have claimed {userSquares.length} square{userSquares.length !== 1 ? 's' : ''} on this board.
                    {userSquares.some(s => s.paymentStatus === 'PENDING') && (
                      <span className="block mt-1">
                        <strong>Note:</strong> Squares marked as "pending" need to be paid to secure your position.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Squares Grid */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Squares Grid</h2>
          <SquaresGrid 
            board={board} 
            userSquares={userSquares}
            currentUserId={user?.id || null}
            activeGames={scoringGames}
            highlightedSquares={highlightedSquares}
            realtimeWinners={realtimeWinners}
          />
        </div>

        {/* Payout Structure */}
        {board.payoutStructure && (
          <div className="mt-6 sm:mt-8 bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payout Structure</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <div className="text-center p-2 sm:p-0">
                <div className="text-base sm:text-lg font-bold text-gray-900">
                  {formatPrice(board.payoutStructure.round1)}
                </div>
                <div className="text-xs sm:text-sm text-gray-500">Round 1</div>
              </div>
              <div className="text-center p-2 sm:p-0">
                <div className="text-base sm:text-lg font-bold text-gray-900">
                  {formatPrice(board.payoutStructure.round2)}
                </div>
                <div className="text-xs sm:text-sm text-gray-500">Round 2</div>
              </div>
              <div className="text-center p-2 sm:p-0">
                <div className="text-base sm:text-lg font-bold text-gray-900">
                  {formatPrice(board.payoutStructure.sweet16)}
                </div>
                <div className="text-xs sm:text-sm text-gray-500">Sweet 16</div>
              </div>
              <div className="text-center p-2 sm:p-0">
                <div className="text-base sm:text-lg font-bold text-gray-900">
                  {formatPrice(board.payoutStructure.elite8)}
                </div>
                <div className="text-xs sm:text-sm text-gray-500">Elite 8</div>
              </div>
              <div className="text-center p-2 sm:p-0">
                <div className="text-base sm:text-lg font-bold text-gray-900">
                  {formatPrice(board.payoutStructure.final4)}
                </div>
                <div className="text-xs sm:text-sm text-gray-500">Final 4</div>
              </div>
              <div className="text-center p-2 sm:p-0">
                <div className="text-base sm:text-lg font-bold text-gray-900">
                  {formatPrice(board.payoutStructure.championship)}
                </div>
                <div className="text-xs sm:text-sm text-gray-500">Championship</div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Winners */}
        {scoringGames.length > 0 && (
          <WinnerDisplay 
            recentWinners={scoringGames.filter(game => 
              game.status === 'COMPLETED' && game.winnerSquare
            ).slice(0, 5)}
            className="mt-8"
          />
        )}

        {/* Tournament Scoring */}
        {(['ACTIVE', 'COMPLETED'].includes(board.status) || scoringGames.length > 0) && (
          <ScoringTable 
            games={scoringGames}
            payoutStructure={board.payoutStructure}
            realtimeUpdates={realtimeGameUpdates}
            className="mt-8"
          />
        )}
      </div>

      {/* Claim Squares Modal */}
      {showClaimModal && (
        <SquareClaimModal
          board={board}
          userSquares={userSquares}
          onClaim={handleClaimSquares}
          onClose={() => setShowClaimModal(false)}
          isLoading={claiming}
        />
      )}

      {/* Real-time Notifications */}
      <RealtimeNotifications
        notifications={notifications}
        onRemove={removeNotification}
        onClear={clearNotifications}
      />
    </div>
  );
};

export default BoardDetail;