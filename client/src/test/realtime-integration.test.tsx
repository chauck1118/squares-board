import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthProvider } from '../contexts/AuthContext';
import { SocketProvider } from '../contexts/SocketContext';
import BoardDetail from '../components/BoardDetail';
import SquaresGrid from '../components/SquaresGrid';
import ScoringTable from '../components/ScoringTable';
import RealtimeNotifications from '../components/RealtimeNotifications';
import { socketService } from '../services/socket';
import { apiService } from '../services/api';

// Mock the services
vi.mock('../services/socket');
vi.mock('../services/api');

const mockSocketService = socketService as any;
const mockApiService = apiService as any;

// Mock React Router params
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'test-board-id' }),
  };
});

// Mock data
const mockBoard = {
  id: 'test-board-id',
  name: 'Test Board',
  status: 'ACTIVE',
  pricePerSquare: 10,
  claimedSquares: 50,
  paidSquares: 45,
  squares: [
    {
      id: 'square-1',
      userId: 'user-1',
      gridPosition: 0,
      paymentStatus: 'PAID' as const,
      user: { id: 'user-1', displayName: 'Test User' }
    }
  ],
  payoutStructure: {
    round1: 25,
    round2: 50,
    sweet16: 100,
    elite8: 200,
    final4: 400,
    championship: 800
  }
};

const mockGame = {
  id: 'game-1',
  gameNumber: 1,
  round: 'Round 1',
  team1: 'Team A',
  team2: 'Team B',
  team1Score: 78,
  team2Score: 65,
  status: 'COMPLETED' as const,
  winnerSquare: {
    id: 'square-1',
    gridPosition: 85,
    user: { id: 'user-1', displayName: 'Test User' }
  },
  payout: 25
};

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  isAdmin: false
};

const mockAuthContext = {
  user: mockUser,
  token: 'test-token',
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  isLoading: false,
  isAuthenticated: true
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      <SocketProvider>
        {children}
      </SocketProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('Real-time Integration Tests', () => {
  let mockSocketEventHandlers: { [key: string]: Function } = {};

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocketEventHandlers = {};

    // Mock socket service methods
    mockSocketService.connect = vi.fn().mockResolvedValue(undefined);
    mockSocketService.disconnect = vi.fn();
    mockSocketService.joinBoard = vi.fn();
    mockSocketService.leaveBoard = vi.fn();
    mockSocketService.on = vi.fn().mockImplementation((event, handler) => {
      mockSocketEventHandlers[event] = handler;
    });
    mockSocketService.off = vi.fn();
    Object.defineProperty(mockSocketService, 'connected', {
      get: vi.fn(() => true)
    });

    // Mock API service methods
    mockApiService.getBoardDetail = vi.fn().mockResolvedValue({
      board: mockBoard
    });
    mockApiService.getBoardScoring = vi.fn().mockResolvedValue({
      scoringTable: { games: [mockGame] }
    });

    // Mock useAuth hook
    vi.doMock('../contexts/AuthContext', () => ({
      useAuth: () => mockAuthContext,
      AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Socket Connection', () => {
    it('should connect to socket when component mounts', async () => {
      render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSocketService.connect).toHaveBeenCalledWith('test-token');
      });
    });

    it('should join board room when connected', async () => {
      render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSocketService.joinBoard).toHaveBeenCalledWith('test-board-id');
      });
    });

    it('should leave board room when component unmounts', async () => {
      const { unmount } = render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      unmount();

      await waitFor(() => {
        expect(mockSocketService.leaveBoard).toHaveBeenCalledWith('test-board-id');
      });
    });
  });

  describe('Real-time Score Updates', () => {
    it('should handle score update events', async () => {
      render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSocketService.on).toHaveBeenCalledWith('score_update', expect.any(Function));
      });

      // Simulate score update event
      const scoreUpdateData = {
        type: 'score_update',
        boardId: 'test-board-id',
        game: {
          ...mockGame,
          team1Score: 80,
          team2Score: 67,
          status: 'IN_PROGRESS'
        },
        timestamp: new Date().toISOString()
      };

      act(() => {
        mockSocketEventHandlers['score_update'](scoreUpdateData);
      });

      // Check that the score is updated in the UI
      await waitFor(() => {
        expect(screen.getByText(/80.*67/)).toBeInTheDocument();
      });
    });

    it('should show real-time notifications for score updates', async () => {
      render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSocketService.on).toHaveBeenCalledWith('score_update', expect.any(Function));
      });

      // Simulate score update event
      const scoreUpdateData = {
        type: 'score_update',
        boardId: 'test-board-id',
        game: mockGame,
        timestamp: new Date().toISOString()
      };

      act(() => {
        mockSocketEventHandlers['score_update'](scoreUpdateData);
      });

      // Check for notification
      await waitFor(() => {
        expect(screen.getByText(/Game #1.*Team A.*78.*65.*Team B/)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Square Claiming', () => {
    it('should handle square claimed events', async () => {
      render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSocketService.on).toHaveBeenCalledWith('square_claimed', expect.any(Function));
      });

      // Simulate square claimed event
      const squareClaimedData = {
        type: 'square_claimed',
        boardId: 'test-board-id',
        square: {
          id: 'square-2',
          userId: 'user-2',
          paymentStatus: 'PENDING' as const,
          user: { id: 'user-2', displayName: 'Another User' }
        },
        timestamp: new Date().toISOString()
      };

      act(() => {
        mockSocketEventHandlers['square_claimed'](squareClaimedData);
      });

      // Check for notification
      await waitFor(() => {
        expect(screen.getByText(/Another User claimed a square/)).toBeInTheDocument();
      });
    });

    it('should update board statistics when squares are claimed', async () => {
      render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('50')).toBeInTheDocument(); // Initial claimed squares
      });

      // Simulate square claimed event
      const squareClaimedData = {
        type: 'square_claimed',
        boardId: 'test-board-id',
        square: {
          id: 'square-2',
          userId: 'user-2',
          paymentStatus: 'PENDING' as const,
          user: { id: 'user-2', displayName: 'Another User' }
        },
        timestamp: new Date().toISOString()
      };

      act(() => {
        mockSocketEventHandlers['square_claimed'](squareClaimedData);
      });

      // Check that claimed squares count is updated
      await waitFor(() => {
        expect(screen.getByText('51')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Payment Updates', () => {
    it('should handle payment confirmed events', async () => {
      render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSocketService.on).toHaveBeenCalledWith('payment_confirmed', expect.any(Function));
      });

      // Simulate payment confirmed event
      const paymentConfirmedData = {
        type: 'payment_confirmed',
        boardId: 'test-board-id',
        square: {
          id: 'square-1',
          userId: 'user-1',
          paymentStatus: 'PAID' as const,
          user: { id: 'user-1', displayName: 'Test User' }
        },
        timestamp: new Date().toISOString()
      };

      act(() => {
        mockSocketEventHandlers['payment_confirmed'](paymentConfirmedData);
      });

      // Check for notification
      await waitFor(() => {
        expect(screen.getByText(/Test User's payment was confirmed/)).toBeInTheDocument();
      });
    });

    it('should update paid squares count when payment is confirmed', async () => {
      render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('45')).toBeInTheDocument(); // Initial paid squares
      });

      // Simulate payment confirmed event for a pending square
      const paymentConfirmedData = {
        type: 'payment_confirmed',
        boardId: 'test-board-id',
        square: {
          id: 'square-2',
          userId: 'user-2',
          paymentStatus: 'PAID' as const,
          user: { id: 'user-2', displayName: 'Another User' }
        },
        timestamp: new Date().toISOString()
      };

      act(() => {
        mockSocketEventHandlers['payment_confirmed'](paymentConfirmedData);
      });

      // Check that paid squares count is updated
      await waitFor(() => {
        expect(screen.getByText('46')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Board Assignment', () => {
    it('should handle board assigned events', async () => {
      render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSocketService.on).toHaveBeenCalledWith('board_assigned', expect.any(Function));
      });

      // Simulate board assigned event
      const boardAssignedData = {
        type: 'board_assigned',
        boardId: 'test-board-id',
        assignment: {
          squares: [
            { id: 'square-1', gridPosition: 0, winningTeamNumber: 8, losingTeamNumber: 5 }
          ]
        },
        timestamp: new Date().toISOString()
      };

      act(() => {
        mockSocketEventHandlers['board_assigned'](boardAssignedData);
      });

      // Check for notification
      await waitFor(() => {
        expect(screen.getByText(/Board squares have been randomly assigned!/)).toBeInTheDocument();
      });

      // Check that board data is refreshed
      await waitFor(() => {
        expect(mockApiService.getBoardDetail).toHaveBeenCalledWith('test-board-id');
      });
    });
  });

  describe('Real-time Winner Announcements', () => {
    it('should handle winner announced events', async () => {
      render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSocketService.on).toHaveBeenCalledWith('winner_announced', expect.any(Function));
      });

      // Simulate winner announced event
      const winnerAnnouncedData = {
        type: 'winner_announced',
        boardId: 'test-board-id',
        winner: {
          game: { id: 'game-1', gameNumber: 1, team1Score: 78, team2Score: 65 },
          square: {
            id: 'square-1',
            gridPosition: 85,
            user: { id: 'user-1', displayName: 'Test User' }
          },
          payout: 25
        },
        timestamp: new Date().toISOString()
      };

      act(() => {
        mockSocketEventHandlers['winner_announced'](winnerAnnouncedData);
      });

      // Check for notification
      await waitFor(() => {
        expect(screen.getByText(/🎉 Test User won \$25!/)).toBeInTheDocument();
      });
    });

    it('should highlight winning squares in the grid', async () => {
      render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSocketService.on).toHaveBeenCalledWith('winner_announced', expect.any(Function));
      });

      // Simulate winner announced event
      const winnerAnnouncedData = {
        type: 'winner_announced',
        boardId: 'test-board-id',
        winner: {
          game: mockGame,
          square: {
            id: 'square-1',
            gridPosition: 85,
            user: { id: 'user-1', displayName: 'Test User' }
          },
          payout: 25
        },
        timestamp: new Date().toISOString()
      };

      act(() => {
        mockSocketEventHandlers['winner_announced'](winnerAnnouncedData);
      });

      // Check that the winning square is highlighted
      await waitFor(() => {
        const winningSquare = screen.getByRole('button', { name: /Square 86.*Test User.*PAID/ });
        expect(winningSquare).toHaveClass('bg-yellow-400');
      });
    });
  });

  describe('Notification Management', () => {
    it('should allow clearing all notifications', async () => {
      render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      // Add some notifications
      const scoreUpdateData = {
        type: 'score_update',
        boardId: 'test-board-id',
        game: mockGame,
        timestamp: new Date().toISOString()
      };

      act(() => {
        mockSocketEventHandlers['score_update'](scoreUpdateData);
      });

      await waitFor(() => {
        expect(screen.getByText(/Game #1/)).toBeInTheDocument();
      });

      // Clear notifications
      const clearButton = screen.getByText('Clear all');
      act(() => {
        clearButton.click();
      });

      await waitFor(() => {
        expect(screen.queryByText(/Game #1/)).not.toBeInTheDocument();
      });
    });

    it('should allow removing individual notifications', async () => {
      render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      // Add a notification
      const scoreUpdateData = {
        type: 'score_update',
        boardId: 'test-board-id',
        game: mockGame,
        timestamp: new Date().toISOString()
      };

      act(() => {
        mockSocketEventHandlers['score_update'](scoreUpdateData);
      });

      await waitFor(() => {
        expect(screen.getByText(/Game #1/)).toBeInTheDocument();
      });

      // Remove the notification
      const removeButton = screen.getByRole('button', { name: /close/ });
      act(() => {
        removeButton.click();
      });

      await waitFor(() => {
        expect(screen.queryByText(/Game #1/)).not.toBeInTheDocument();
      });
    });

    it('should auto-remove notifications after timeout', async () => {
      vi.useFakeTimers();

      render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      // Add a notification
      const scoreUpdateData = {
        type: 'score_update',
        boardId: 'test-board-id',
        game: mockGame,
        timestamp: new Date().toISOString()
      };

      act(() => {
        mockSocketEventHandlers['score_update'](scoreUpdateData);
      });

      await waitFor(() => {
        expect(screen.getByText(/Game #1/)).toBeInTheDocument();
      });

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.queryByText(/Game #1/)).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe('Enhanced Real-time Grid Features', () => {
    it('should highlight squares with real-time updates', async () => {
      const mockBoardWithAssignedSquares = {
        ...mockBoard,
        status: 'ASSIGNED',
        squares: [
          {
            id: 'square-1',
            userId: 'user-1',
            gridPosition: 85,
            paymentStatus: 'PAID' as const,
            user: { id: 'user-1', displayName: 'Test User' }
          }
        ]
      };

      mockApiService.getBoardDetail = vi.fn().mockResolvedValue({
        board: mockBoardWithAssignedSquares
      });

      render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSocketService.on).toHaveBeenCalledWith('winner_announced', expect.any(Function));
      });

      // Simulate winner announced event
      const winnerAnnouncedData = {
        type: 'winner_announced',
        boardId: 'test-board-id',
        winner: {
          game: mockGame,
          square: {
            id: 'square-1',
            gridPosition: 85,
            user: { id: 'user-1', displayName: 'Test User' }
          },
          payout: 25
        },
        timestamp: new Date().toISOString()
      };

      act(() => {
        mockSocketEventHandlers['winner_announced'](winnerAnnouncedData);
      });

      // Check that the square is highlighted with animation
      await waitFor(() => {
        const highlightedSquare = screen.getByRole('button', { name: /Square 86/ });
        expect(highlightedSquare).toHaveClass('animate-pulse');
      });
    });

    it('should show real-time indicators in scoring table', async () => {
      render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSocketService.on).toHaveBeenCalledWith('score_update', expect.any(Function));
      });

      // Simulate score update event
      const scoreUpdateData = {
        type: 'score_update',
        boardId: 'test-board-id',
        game: {
          ...mockGame,
          team1Score: 82,
          team2Score: 70,
          status: 'IN_PROGRESS'
        },
        timestamp: new Date().toISOString()
      };

      act(() => {
        mockSocketEventHandlers['score_update'](scoreUpdateData);
      });

      // Check that the game row has real-time indicator
      await waitFor(() => {
        const gameRow = screen.getByText('Game #1').closest('tr');
        expect(gameRow).toHaveClass('animate-pulse');
      });
    });

    it('should remove real-time indicators after timeout', async () => {
      vi.useFakeTimers();

      render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSocketService.on).toHaveBeenCalledWith('score_update', expect.any(Function));
      });

      // Simulate score update event
      const scoreUpdateData = {
        type: 'score_update',
        boardId: 'test-board-id',
        game: mockGame,
        timestamp: new Date().toISOString()
      };

      act(() => {
        mockSocketEventHandlers['score_update'](scoreUpdateData);
      });

      // Check that indicator is present
      await waitFor(() => {
        const gameRow = screen.getByText('Game #1').closest('tr');
        expect(gameRow).toHaveClass('animate-pulse');
      });

      // Fast-forward time to remove indicator
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        const gameRow = screen.getByText('Game #1').closest('tr');
        expect(gameRow).not.toHaveClass('animate-pulse');
      });

      vi.useRealTimers();
    });
  });

  describe('Standalone Component Tests', () => {
    describe('SquaresGrid Real-time Features', () => {
      const mockSquaresGridProps = {
        board: {
          ...mockBoard,
          status: 'ASSIGNED' as const,
          squares: [
            {
              id: 'square-1',
              userId: 'user-1',
              gridPosition: 0,
              paymentStatus: 'PAID' as const,
              user: { id: 'user-1', displayName: 'Test User' }
            }
          ]
        },
        userSquares: [],
        currentUserId: 'user-1',
        highlightedSquares: [0, 15, 30],
        realtimeWinners: [{ gameId: 'game-1', gridPosition: 0, payout: 25 }],
        activeGames: [mockGame]
      };

      it('should highlight squares based on highlightedSquares prop', () => {
        render(<SquaresGrid {...mockSquaresGridProps} />);

        // Check that highlighted squares have animation
        const highlightedSquare = screen.getByRole('button', { name: /Square 1/ });
        expect(highlightedSquare).toHaveClass('animate-pulse');
      });

      it('should show winner highlighting for real-time winners', () => {
        render(<SquaresGrid {...mockSquaresGridProps} />);

        // Check that winning square has winner styling
        const winningSquare = screen.getByRole('button', { name: /Square 1/ });
        expect(winningSquare).toHaveClass('bg-yellow-400');
      });
    });

    describe('ScoringTable Real-time Features', () => {
      const mockScoringTableProps = {
        games: [mockGame],
        payoutStructure: mockBoard.payoutStructure,
        realtimeUpdates: ['game-1']
      };

      it('should show real-time indicators for updated games', () => {
        render(<ScoringTable {...mockScoringTableProps} />);

        // Check for real-time indicator dot
        const indicator = screen.getByTestId('realtime-indicator') || screen.getByRole('generic');
        expect(indicator).toHaveClass('bg-blue-500', 'animate-pulse');
      });

      it('should apply animation to updated game rows', () => {
        render(<ScoringTable {...mockScoringTableProps} />);

        const gameRow = screen.getByText('Game #1').closest('div');
        expect(gameRow).toHaveClass('animate-pulse');
      });
    });

    describe('RealtimeNotifications Sound Features', () => {
      const mockNotifications = [
        {
          id: '1',
          type: 'winner_announced' as const,
          message: 'Test User won $25!',
          timestamp: new Date().toISOString(),
          data: {}
        }
      ];

      // Mock Web Audio API
      beforeEach(() => {
        const mockAudioContext = {
          createOscillator: vi.fn(() => ({
            connect: vi.fn(),
            frequency: { value: 0 },
            type: 'sine',
            start: vi.fn(),
            stop: vi.fn()
          })),
          createGain: vi.fn(() => ({
            connect: vi.fn(),
            gain: {
              setValueAtTime: vi.fn(),
              exponentialRampToValueAtTime: vi.fn()
            }
          })),
          destination: {},
          currentTime: 0
        };

        (global as any).AudioContext = vi.fn(() => mockAudioContext);
        (global as any).webkitAudioContext = vi.fn(() => mockAudioContext);
      });

      it('should play sound for winner announcements when enabled', () => {
        const mockOnRemove = vi.fn();
        const mockOnClear = vi.fn();

        render(
          <RealtimeNotifications
            notifications={mockNotifications}
            onRemove={mockOnRemove}
            onClear={mockOnClear}
            soundEnabled={true}
          />
        );

        // Check that AudioContext was created
        expect(global.AudioContext).toHaveBeenCalled();
      });

      it('should not play sound when disabled', () => {
        const mockOnRemove = vi.fn();
        const mockOnClear = vi.fn();

        render(
          <RealtimeNotifications
            notifications={mockNotifications}
            onRemove={mockOnRemove}
            onClear={mockOnClear}
            soundEnabled={false}
          />
        );

        // Check that AudioContext was not created
        expect(global.AudioContext).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle socket connection errors gracefully', async () => {
      mockSocketService.connect = vi.fn().mockRejectedValue(new Error('Connection failed'));

      render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSocketService.connect).toHaveBeenCalledWith('test-token');
      });

      // Component should still render without crashing
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    it('should ignore events from other boards', async () => {
      render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSocketService.on).toHaveBeenCalledWith('score_update', expect.any(Function));
      });

      // Simulate score update event for different board
      const scoreUpdateData = {
        type: 'score_update',
        boardId: 'different-board-id',
        game: mockGame,
        timestamp: new Date().toISOString()
      };

      act(() => {
        mockSocketEventHandlers['score_update'](scoreUpdateData);
      });

      // Should not show notification for different board
      await waitFor(() => {
        expect(screen.queryByText(/Game #1/)).not.toBeInTheDocument();
      });
    });

    it('should handle malformed real-time events gracefully', async () => {
      render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSocketService.on).toHaveBeenCalledWith('score_update', expect.any(Function));
      });

      // Simulate malformed score update event
      const malformedData = {
        type: 'score_update',
        boardId: 'test-board-id',
        // Missing game data
        timestamp: new Date().toISOString()
      };

      // Should not crash when handling malformed data
      expect(() => {
        act(() => {
          mockSocketEventHandlers['score_update'](malformedData);
        });
      }).not.toThrow();

      // Component should still be functional
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    it('should handle audio API errors gracefully', () => {
      // Mock AudioContext to throw error
      (global as any).AudioContext = vi.fn(() => {
        throw new Error('Audio not supported');
      });

      const mockNotifications = [
        {
          id: '1',
          type: 'winner_announced' as const,
          message: 'Test User won $25!',
          timestamp: new Date().toISOString(),
          data: {}
        }
      ];

      const mockOnRemove = vi.fn();
      const mockOnClear = vi.fn();

      // Should not crash when audio fails
      expect(() => {
        render(
          <RealtimeNotifications
            notifications={mockNotifications}
            onRemove={mockOnRemove}
            onClear={mockOnClear}
            soundEnabled={true}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should clean up event listeners on unmount', async () => {
      const { unmount } = render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSocketService.on).toHaveBeenCalled();
      });

      unmount();

      // Check that event listeners are cleaned up
      await waitFor(() => {
        expect(mockSocketService.off).toHaveBeenCalledWith('score_update', expect.any(Function));
        expect(mockSocketService.off).toHaveBeenCalledWith('square_claimed', expect.any(Function));
        expect(mockSocketService.off).toHaveBeenCalledWith('payment_confirmed', expect.any(Function));
        expect(mockSocketService.off).toHaveBeenCalledWith('board_assigned', expect.any(Function));
        expect(mockSocketService.off).toHaveBeenCalledWith('winner_announced', expect.any(Function));
      });
    });

    it('should limit notification history to prevent memory leaks', async () => {
      render(
        <TestWrapper>
          <BoardDetail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSocketService.on).toHaveBeenCalledWith('score_update', expect.any(Function));
      });

      // Add 15 notifications (more than the 10 limit)
      for (let i = 0; i < 15; i++) {
        const scoreUpdateData = {
          type: 'score_update',
          boardId: 'test-board-id',
          game: { ...mockGame, id: `game-${i}`, gameNumber: i + 1 },
          timestamp: new Date().toISOString()
        };

        act(() => {
          mockSocketEventHandlers['score_update'](scoreUpdateData);
        });
      }

      // Should only show the last 10 notifications
      await waitFor(() => {
        expect(screen.queryByText(/Game #1/)).not.toBeInTheDocument();
        expect(screen.getByText(/Game #15/)).toBeInTheDocument();
      });
    });
  });
});