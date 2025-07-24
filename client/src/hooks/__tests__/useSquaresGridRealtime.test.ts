import { renderHook, act } from '@testing-library/react-hooks';
import { useSquaresGridRealtime } from '../useSquaresGridRealtime';

// Mock the subscription context
const mockOn = jest.fn();
const mockOff = jest.fn();

jest.mock('../../contexts/SubscriptionContext', () => ({
  useSubscription: () => ({
    connected: true,
    on: mockOn,
    off: mockOff
  })
}));

describe('useSquaresGridRealtime Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  it('should register event listeners when connected', () => {
    renderHook(() => useSquaresGridRealtime({ boardId: 'test-board' }));
    
    // Check that event listeners were registered
    expect(mockOn).toHaveBeenCalledWith('square_claimed', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('payment_confirmed', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('board_assigned', expect.any(Function));
  });

  it('should handle square claimed events', () => {
    const onSquareUpdate = jest.fn();
    
    const { result } = renderHook(() => 
      useSquaresGridRealtime({ 
        boardId: 'test-board',
        onSquareUpdate
      })
    );
    
    // Get the square claimed handler
    const squareClaimedHandler = mockOn.mock.calls.find(
      call => call[0] === 'square_claimed'
    )[1];
    
    // Simulate a square claimed event
    act(() => {
      squareClaimedHandler({
        boardId: 'test-board',
        square: {
          id: 'square-1',
          gridPosition: 42,
          userId: 'user-1',
          paymentStatus: 'PENDING'
        }
      });
    });
    
    // Check that the callback was called
    expect(onSquareUpdate).toHaveBeenCalledWith({
      id: 'square-1',
      gridPosition: 42,
      userId: 'user-1',
      paymentStatus: 'PENDING'
    });
    
    // Check that the square was highlighted
    expect(result.current.highlightedSquares).toContain(42);
    
    // Fast-forward time to clear highlights
    jest.advanceTimersByTime(3000);
    
    // Check that the highlight was removed
    expect(result.current.highlightedSquares).not.toContain(42);
  });

  it('should handle offline status', () => {
    // Mock navigator.onLine to be false
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
    
    const { result } = renderHook(() => 
      useSquaresGridRealtime({ boardId: 'test-board' })
    );
    
    // Check that isOffline is true
    expect(result.current.isOffline).toBe(true);
    
    // Simulate coming back online
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      window.dispatchEvent(new Event('online'));
    });
    
    // Check that isOffline is now false
    expect(result.current.isOffline).toBe(false);
  });

  it('should clean up event listeners on unmount', () => {
    const { unmount } = renderHook(() => 
      useSquaresGridRealtime({ boardId: 'test-board' })
    );
    
    // Unmount the hook
    unmount();
    
    // Check that event listeners were removed
    expect(mockOff).toHaveBeenCalledWith('square_claimed', expect.any(Function));
    expect(mockOff).toHaveBeenCalledWith('payment_confirmed', expect.any(Function));
    expect(mockOff).toHaveBeenCalledWith('board_assigned', expect.any(Function));
  });
});