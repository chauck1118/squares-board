import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAmplifyOperation, useAmplifyMutation, useAmplifySubscription } from '../hooks/useAmplifyOperation';
import { AmplifyErrorCategory, AmplifyErrorCode } from '../utils/amplifyErrorHandling';
import React from 'react';

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock window.addEventListener for online/offline events
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
Object.defineProperty(window, 'addEventListener', { value: mockAddEventListener });
Object.defineProperty(window, 'removeEventListener', { value: mockRemoveEventListener });

describe('useAmplifyOperation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigator.onLine = true;
  });

  const TestComponent: React.FC<{ 
    operation: () => Promise<string>;
    options?: any;
  }> = ({ operation, options = {} }) => {
    const { 
      data, 
      loading, 
      error, 
      execute, 
      retry, 
      reset, 
      refresh,
      isRetryable,
      isCached,
      canRetry,
      isOffline
    } = useAmplifyOperation(operation, 'test-context', options);

    return (
      <div>
        <button onClick={() => execute()}>Execute</button>
        <button onClick={() => execute(true)}>Force Execute</button>
        <button onClick={retry}>Retry</button>
        <button onClick={reset}>Reset</button>
        <button onClick={refresh}>Refresh</button>
        
        {loading && <div data-testid="loading">Loading...</div>}
        {error && (
          <div data-testid="error">
            <div data-testid="error-message">{error.message}</div>
            <div data-testid="error-category">{error.category}</div>
            <div data-testid="error-code">{error.code}</div>
            <div data-testid="error-retryable">{error.isRetryable.toString()}</div>
          </div>
        )}
        {data && <div data-testid="data">{data}</div>}
        
        <div data-testid="is-retryable">{isRetryable.toString()}</div>
        <div data-testid="is-cached">{isCached.toString()}</div>
        <div data-testid="can-retry">{canRetry.toString()}</div>
        <div data-testid="is-offline">{isOffline.toString()}</div>
      </div>
    );
  };

  it('should handle successful operations', async () => {
    const operation = vi.fn().mockResolvedValue('test data');
    render(<TestComponent operation={operation} />);

    fireEvent.click(screen.getByText('Execute'));

    expect(screen.getByTestId('loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent('test data');
    });

    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('error')).not.toBeInTheDocument();
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should handle operation errors with proper categorization', async () => {
    const authError = {
      name: 'NotAuthorizedException',
      message: 'Invalid credentials'
    };
    const operation = vi.fn().mockRejectedValue(authError);
    render(<TestComponent operation={operation} />);

    fireEvent.click(screen.getByText('Execute'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    expect(screen.getByTestId('error-category')).toHaveTextContent(AmplifyErrorCategory.AUTH);
    expect(screen.getByTestId('error-code')).toHaveTextContent(AmplifyErrorCode.INVALID_CREDENTIALS);
    expect(screen.getByTestId('error-retryable')).toHaveTextContent('false');
    expect(screen.getByTestId('can-retry')).toHaveTextContent('false');
  });

  it('should support caching with cache time', async () => {
    const operation = vi.fn().mockResolvedValue('cached data');
    render(<TestComponent operation={operation} options={{ cacheTime: 10000 }} />);

    // First execution
    fireEvent.click(screen.getByText('Execute'));
    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent('cached data');
    });

    expect(operation).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('is-cached')).toHaveTextContent('true');

    // Second execution should use cache
    fireEvent.click(screen.getByText('Execute'));
    expect(operation).toHaveBeenCalledTimes(1); // Still only called once

    // Force refresh should bypass cache
    fireEvent.click(screen.getByText('Force Execute'));
    await waitFor(() => {
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  it('should handle offline scenarios', async () => {
    const operation = vi.fn().mockResolvedValue('online data');
    render(<TestComponent operation={operation} options={{ enableOfflineSupport: false }} />);

    // Simulate going offline
    navigator.onLine = false;

    fireEvent.click(screen.getByText('Execute'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    expect(screen.getByTestId('is-offline')).toHaveTextContent('true');
  });

  it('should call success and error callbacks', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('First error'))
      .mockResolvedValue('success data');

    render(<TestComponent operation={operation} options={{ onSuccess, onError }} />);

    // First execution fails
    fireEvent.click(screen.getByText('Execute'));
    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();

    // Retry succeeds
    fireEvent.click(screen.getByText('Retry'));
    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent('success data');
    });

    expect(onSuccess).toHaveBeenCalledWith('success data');
  });

  it('should handle online/offline event listeners', () => {
    const operation = vi.fn().mockResolvedValue('data');
    const { unmount } = render(<TestComponent operation={operation} />);

    // Check that event listeners were added
    expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function));

    // Unmount and check cleanup
    unmount();
    expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('should reset state properly', async () => {
    const operation = vi.fn().mockResolvedValue('test data');
    render(<TestComponent operation={operation} />);

    // Execute operation
    fireEvent.click(screen.getByText('Execute'));
    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent('test data');
    });

    // Reset state
    fireEvent.click(screen.getByText('Reset'));

    expect(screen.queryByTestId('data')).not.toBeInTheDocument();
    expect(screen.queryByTestId('error')).not.toBeInTheDocument();
    expect(screen.getByTestId('is-cached')).toHaveTextContent('false');
  });
});

describe('useAmplifyMutation', () => {
  const TestMutationComponent: React.FC<{ 
    mutation: (input: string) => Promise<string>;
    options?: any;
  }> = ({ mutation, options = {} }) => {
    const { 
      data, 
      loading, 
      error, 
      mutate, 
      reset,
      isSubmitting,
      isRetryable,
      isOffline
    } = useAmplifyMutation(mutation, 'mutation-context', options);

    return (
      <div>
        <button onClick={() => mutate('test input')}>Mutate</button>
        <button onClick={reset}>Reset</button>
        
        {loading && <div data-testid="loading">Loading...</div>}
        {error && (
          <div data-testid="error">
            <div data-testid="error-message">{error.message}</div>
            <div data-testid="error-category">{error.category}</div>
          </div>
        )}
        {data && <div data-testid="data">{data}</div>}
        
        <div data-testid="is-submitting">{isSubmitting.toString()}</div>
        <div data-testid="is-retryable">{isRetryable.toString()}</div>
        <div data-testid="is-offline">{isOffline.toString()}</div>
      </div>
    );
  };

  it('should handle successful mutations', async () => {
    const mutation = vi.fn().mockResolvedValue('mutation result');
    render(<TestMutationComponent mutation={mutation} />);

    fireEvent.click(screen.getByText('Mutate'));

    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.getByTestId('is-submitting')).toHaveTextContent('true');

    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent('mutation result');
    });

    expect(mutation).toHaveBeenCalledWith('test input');
    expect(screen.getByTestId('is-submitting')).toHaveTextContent('false');
  });

  it('should handle mutation errors', async () => {
    const validationError = {
      errors: [{
        message: 'Invalid input',
        extensions: { errorType: 'ValidationException' }
      }]
    };
    const mutation = vi.fn().mockRejectedValue(validationError);
    render(<TestMutationComponent mutation={mutation} />);

    fireEvent.click(screen.getByText('Mutate'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    expect(screen.getByTestId('error-category')).toHaveTextContent(AmplifyErrorCategory.VALIDATION);
    expect(screen.getByTestId('is-retryable')).toHaveTextContent('false');
  });

  it('should call success and error callbacks', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const mutation = vi.fn().mockRejectedValue(new Error('Mutation failed'));

    render(<TestMutationComponent mutation={mutation} options={{ onSuccess, onError }} />);

    fireEvent.click(screen.getByText('Mutate'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('should reset mutation state', async () => {
    const mutation = vi.fn().mockResolvedValue('mutation result');
    render(<TestMutationComponent mutation={mutation} />);

    // Execute mutation
    fireEvent.click(screen.getByText('Mutate'));
    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent('mutation result');
    });

    // Reset state
    fireEvent.click(screen.getByText('Reset'));

    expect(screen.queryByTestId('data')).not.toBeInTheDocument();
    expect(screen.queryByTestId('error')).not.toBeInTheDocument();
  });
});

describe('useAmplifySubscription', () => {
  const TestSubscriptionComponent: React.FC<{ 
    subscription: () => { subscribe: (observer: any) => { unsubscribe: () => void } };
    options?: any;
  }> = ({ subscription, options = {} }) => {
    const { 
      data, 
      loading, 
      error, 
      subscribe: startSubscription, 
      unsubscribe, 
      reset,
      isConnected,
      isRetryable,
      isOffline
    } = useAmplifySubscription(subscription, 'subscription-context', options);

    React.useEffect(() => {
      startSubscription();
    }, [startSubscription]);

    return (
      <div>
        <button onClick={startSubscription}>Subscribe</button>
        <button onClick={unsubscribe}>Unsubscribe</button>
        <button onClick={reset}>Reset</button>
        
        {loading && <div data-testid="loading">Loading...</div>}
        {error && (
          <div data-testid="error">
            <div data-testid="error-message">{error.message}</div>
          </div>
        )}
        {data && <div data-testid="data">{data}</div>}
        
        <div data-testid="is-connected">{isConnected.toString()}</div>
        <div data-testid="is-retryable">{isRetryable.toString()}</div>
        <div data-testid="is-offline">{isOffline.toString()}</div>
      </div>
    );
  };

  it('should handle successful subscriptions', async () => {
    const mockUnsubscribe = vi.fn();
    const mockSubscribe = vi.fn((observer) => {
      // Simulate receiving data
      setTimeout(() => observer.next('subscription data'), 100);
      return { unsubscribe: mockUnsubscribe };
    });

    const subscription = vi.fn(() => ({ subscribe: mockSubscribe }));
    render(<TestSubscriptionComponent subscription={subscription} />);

    expect(screen.getByTestId('loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent('subscription data');
    });

    expect(screen.getByTestId('is-connected')).toHaveTextContent('true');
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
  });

  it('should handle subscription errors', async () => {
    const mockUnsubscribe = vi.fn();
    const mockSubscribe = vi.fn((observer) => {
      // Simulate error
      setTimeout(() => observer.error(new Error('Subscription failed')), 100);
      return { unsubscribe: mockUnsubscribe };
    });

    const subscription = vi.fn(() => ({ subscribe: mockSubscribe }));
    render(<TestSubscriptionComponent subscription={subscription} />);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    expect(screen.getByTestId('error-message')).toHaveTextContent('Subscription failed');
    expect(screen.getByTestId('is-connected')).toHaveTextContent('false');
  });

  it('should handle subscription setup errors', () => {
    const subscription = vi.fn(() => {
      throw new Error('Failed to create subscription');
    });

    render(<TestSubscriptionComponent subscription={subscription} />);

    expect(screen.getByTestId('error')).toBeInTheDocument();
    expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to create subscription');
  });

  it('should unsubscribe properly', async () => {
    const mockUnsubscribe = vi.fn();
    const mockSubscribe = vi.fn((observer) => {
      setTimeout(() => observer.next('subscription data'), 100);
      return { unsubscribe: mockUnsubscribe };
    });

    const subscription = vi.fn(() => ({ subscribe: mockSubscribe }));
    render(<TestSubscriptionComponent subscription={subscription} />);

    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent('subscription data');
    });

    fireEvent.click(screen.getByText('Unsubscribe'));

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should call success and error callbacks', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    
    const mockUnsubscribe = vi.fn();
    const mockSubscribe = vi.fn((observer) => {
      setTimeout(() => observer.next('subscription data'), 100);
      return { unsubscribe: mockUnsubscribe };
    });

    const subscription = vi.fn(() => ({ subscribe: mockSubscribe }));
    render(<TestSubscriptionComponent subscription={subscription} options={{ onSuccess, onError }} />);

    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent('subscription data');
    });

    expect(onSuccess).toHaveBeenCalledWith('subscription data');
  });

  it('should reset subscription state', async () => {
    const mockUnsubscribe = vi.fn();
    const mockSubscribe = vi.fn((observer) => {
      setTimeout(() => observer.next('subscription data'), 100);
      return { unsubscribe: mockUnsubscribe };
    });

    const subscription = vi.fn(() => ({ subscribe: mockSubscribe }));
    render(<TestSubscriptionComponent subscription={subscription} />);

    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent('subscription data');
    });

    fireEvent.click(screen.getByText('Reset'));

    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(screen.queryByTestId('data')).not.toBeInTheDocument();
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });
});

describe('Offline Support', () => {
  beforeEach(() => {
    navigator.onLine = true;
  });

  it('should detect offline state', () => {
    navigator.onLine = false;
    
    const TestComponent: React.FC = () => {
      const { isOffline } = useAmplifyOperation(() => Promise.resolve('data'), 'test');
      return <div data-testid="offline">{isOffline.toString()}</div>;
    };

    render(<TestComponent />);
    expect(screen.getByTestId('offline')).toHaveTextContent('true');
  });

  it('should handle online/offline transitions', () => {
    const onOffline = vi.fn();
    const onOnline = vi.fn();
    
    const TestComponent: React.FC = () => {
      useAmplifyOperation(() => Promise.resolve('data'), 'test', { onOffline, onOnline });
      return <div>Test</div>;
    };

    render(<TestComponent />);

    // Get the event listeners that were registered
    const onlineHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'online')?.[1];
    const offlineHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'offline')?.[1];

    // Simulate going offline
    navigator.onLine = false;
    if (offlineHandler) offlineHandler();
    expect(onOffline).toHaveBeenCalled();

    // Simulate coming back online
    navigator.onLine = true;
    if (onlineHandler) onlineHandler();
    expect(onOnline).toHaveBeenCalled();
  });
});