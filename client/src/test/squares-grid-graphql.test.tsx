import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import SquaresGrid from '../components/SquaresGrid';
import { BoardDetail, Square } from '../types/board';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import { subscriptionService } from '../services/subscription';

// Mock the subscription service
jest.mock('../services/subscription', () => ({
  subscriptionService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    subscribeToBoard: jest.fn(),
    unsubscribeFromBoard: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    unsubscribeAll: jest.fn()
  }
}));

// Mock the subscription context
jest.mock('../contexts/SubscriptionContext', () => {
  const originalModule = jest.requireActual('../contexts/SubscriptionContext');
  return {
    ...originalModule,
    useSubscription: () => ({
      connected: true,
      joinBoard: jest.fn(),
      leaveBoard: jest.fn(),
      on: jest.fn(),
      off: jest.fn()
    })
  };
});

// Mock DataStore
jest.mock('aws-amplify/datastore', () => ({
  DataStore: {
    query: jest.fn(),
    start: jest.fn(),
    clear: jest.fn()
  }
}));

describe('SquaresGrid GraphQL Integration', () => {
  // Mock data
  const mockBoard: BoardDetail = {
    id: 'board-1',
    name: 'Test Board',
    status: 'ACTIVE',
    pricePerSquare: 10,
    totalSquares: 100,
    claimedSquares: 100,
    paidSquares: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    squares: Array(100).fill(null).map((_, i) => ({
      id: `square-${i}`,
      boardId: 'board-1',
      userId: i % 10 === 0 ? 'test-user-id' : `user-${i}`,
      gridPosition: i,
      paymentStatus: 'PAID',
      winningTeamNumber: Math.floor(i / 10),
      losingTeamNumber: i % 10,
      createdAt: new Date().toISOString(),
      user: i % 10 === 0 ? {
        id: 'test-user-id',
        displayName: 'Test User'
      } : {
        id: `user-${i}`,
        displayName: `User ${i}`
      }
    })),
    payoutStructure: {
      id: 'payout-1',
      boardId: 'board-1',
      round1: 25,
      round2: 50,
      sweet16: 100,
      elite8: 200,
      final4: 300,
      championship: 500
    },
    games: []
  };

  const userSquares: Square[] = mockBoard.squares.filter(s => s.userId === 'test-user-id');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle GraphQL subscription updates for squares', async () => {
    // Mock the subscription context with working event handlers
    let squareClaimedHandler: any;
    
    jest.spyOn(React, 'useEffect').mockImplementation((effect) => {
      effect();
    });
    
    (subscriptionService.on as jest.Mock).mockImplementation((event, handler) => {
      if (event === 'square_claimed') {
        squareClaimedHandler = handler;
      }
    });

    const onSquareUpdate = jest.fn();

    render(
      <SubscriptionProvider>
        <SquaresGrid
          board={mockBoard}
          userSquares={userSquares}
          currentUserId="test-user-id"
          onSquareUpdate={onSquareUpdate}
        />
      </SubscriptionProvider>
    );

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getAllByRole('button').length).toBe(100);
    });

    // Simulate a square claimed event
    if (squareClaimedHandler) {
      act(() => {
        squareClaimedHandler({
          type: 'square_claimed',
          boardId: 'board-1',
          square: {
            id: 'new-square',
            userId: 'test-user-id',
            gridPosition: 42,
            paymentStatus: 'PENDING',
            user: {
              id: 'test-user-id',
              displayName: 'Test User'
            }
          },
          timestamp: new Date().toISOString()
        });
      });
    }

    // Check that the callback was called
    expect(onSquareUpdate).toHaveBeenCalled();
  });

  it('should handle offline mode gracefully', async () => {
    // Mock navigator.onLine to be false
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

    render(
      <SubscriptionProvider>
        <SquaresGrid
          board={mockBoard}
          userSquares={userSquares}
          currentUserId="test-user-id"
        />
      </SubscriptionProvider>
    );

    // Check for offline message
    await waitFor(() => {
      expect(screen.getByText(/You're offline/)).toBeInTheDocument();
    });

    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  it('should handle mobile-optimized interactions', async () => {
    // Mock window.innerWidth to simulate mobile device
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'));

    render(
      <SubscriptionProvider>
        <SquaresGrid
          board={mockBoard}
          userSquares={userSquares}
          currentUserId="test-user-id"
        />
      </SubscriptionProvider>
    );

    // Check that squares have mobile-specific classes
    const squares = screen.getAllByRole('button');
    
    // Check for touch-manipulation class which is used for mobile optimization
    expect(squares[0].className).toContain('touch-manipulation');
    
    // Reset window.innerWidth
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    window.dispatchEvent(new Event('resize'));
  });
});