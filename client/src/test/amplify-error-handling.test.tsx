import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AmplifyErrorHandler, AmplifyErrorCategory, AmplifyErrorCode, withAmplifyRetry } from '../utils/amplifyErrorHandling';
import { useAmplifyOperation, useAmplifyMutation, useAmplifySubscription } from '../hooks/useAmplifyOperation';
import { AmplifyErrorDisplay, AmplifyErrorToast, AmplifyInlineError } from '../components/AmplifyErrorDisplay';
import { AmplifyLoading, LoadingButton } from '../components/LoadingSpinner';
import React from 'react';

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('AmplifyErrorHandler', () => {
  describe('parseError', () => {
    it('should parse GraphQL authorization errors', () => {
      const graphqlError = {
        errors: [{
          message: 'Unauthorized',
          extensions: {
            errorType: 'Unauthorized',
            code: 'UNAUTHORIZED'
          }
        }]
      };

      const result = AmplifyErrorHandler.parseError(graphqlError, 'test-context');

      expect(result.category).toBe(AmplifyErrorCategory.AUTHORIZATION);
      expect(result.code).toBe(AmplifyErrorCode.UNAUTHORIZED);
      expect(result.message).toBe('You are not authorized to perform this action.');
      expect(result.isRetryable).toBe(false);
      expect(result.path).toBe('test-context');
    });

    it('should parse GraphQL validation errors', () => {
      const validationError = {
        errors: [{
          message: 'Invalid input provided',
          extensions: {
            errorType: 'ValidationException',
            validationErrors: ['Field is required']
          }
        }]
      };

      const result = AmplifyErrorHandler.parseError(validationError, 'validation-test');

      expect(result.category).toBe(AmplifyErrorCategory.VALIDATION);
      expect(result.code).toBe(AmplifyErrorCode.GRAPHQL_VALIDATION_ERROR);
      expect(result.details).toEqual(['Field is required']);
      expect(result.isRetryable).toBe(false);
    });

    it('should parse AWS Cognito auth errors', () => {
      const authError = {
        name: 'UserNotConfirmedException',
        message: 'User is not confirmed'
      };

      const result = AmplifyErrorHandler.parseError(authError);

      expect(result.category).toBe(AmplifyErrorCategory.AUTH);
      expect(result.code).toBe(AmplifyErrorCode.USER_NOT_CONFIRMED);
      expect(result.suggestions).toContain('Check your email for a confirmation link');
    });

    it('should parse network errors', () => {
      const networkError = {
        code: 'NETWORK_ERROR',
        message: 'Network Error'
      };

      const result = AmplifyErrorHandler.parseError(networkError);

      expect(result.category).toBe(AmplifyErrorCategory.NETWORK);
      expect(result.code).toBe(AmplifyErrorCode.NETWORK_ERROR);
      expect(result.isNetworkError).toBe(true);
      expect(result.isRetryable).toBe(true);
    });

    it('should parse DataStore conflict errors', () => {
      const conflictError = {
        errorType: 'DataStoreConflictError',
        localModel: { id: '1', name: 'local' },
        serverModel: { id: '1', name: 'server' }
      };

      const result = AmplifyErrorHandler.parseError(conflictError);

      expect(result.category).toBe(AmplifyErrorCategory.DATASTORE);
      expect(result.code).toBe(AmplifyErrorCode.DATASTORE_CONFLICT);
      expect(result.details).toEqual({
        local: { id: '1', name: 'local' },
        server: { id: '1', name: 'server' }
      });
    });

    it('should handle unknown errors gracefully', () => {
      const unknownError = { someProperty: 'unknown' };

      const result = AmplifyErrorHandler.parseError(unknownError);

      expect(result.category).toBe(AmplifyErrorCategory.UNKNOWN);
      expect(result.code).toBe(AmplifyErrorCode.UNKNOWN_ERROR);
      expect(result.isRetryable).toBe(true);
    });
  });

  describe('getRetryDelay', () => {
    it('should return longer delays for rate limiting errors', () => {
      const rateLimitError = {
        category: AmplifyErrorCategory.RATE_LIMIT,
        code: AmplifyErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Rate limit exceeded',
        isRetryable: true,
        isNetworkError: false,
        timestamp: new Date(),
      };

      expect(AmplifyErrorHandler.getRetryDelay(rateLimitError, 1)).toBe(5000);
      expect(AmplifyErrorHandler.getRetryDelay(rateLimitError, 2)).toBe(10000);
    });

    it('should return shorter delays for network errors', () => {
      const networkError = {
        category: AmplifyErrorCategory.NETWORK,
        code: AmplifyErrorCode.NETWORK_ERROR,
        message: 'Network error',
        isRetryable: true,
        isNetworkError: true,
        timestamp: new Date(),
      };

      expect(AmplifyErrorHandler.getRetryDelay(networkError, 1)).toBe(1000);
      expect(AmplifyErrorHandler.getRetryDelay(networkError, 2)).toBe(2000);
    });
  });

  describe('shouldAutoRetry', () => {
    it('should not retry auth errors', () => {
      const authError = {
        category: AmplifyErrorCategory.AUTH,
        code: AmplifyErrorCode.INVALID_CREDENTIALS,
        message: 'Invalid credentials',
        isRetryable: false,
        isNetworkError: false,
        timestamp: new Date(),
      };

      expect(AmplifyErrorHandler.shouldAutoRetry(authError, 1)).toBe(false);
    });

    it('should not retry after max attempts', () => {
      const networkError = {
        category: AmplifyErrorCategory.NETWORK,
        code: AmplifyErrorCode.NETWORK_ERROR,
        message: 'Network error',
        isRetryable: true,
        isNetworkError: true,
        timestamp: new Date(),
      };

      expect(AmplifyErrorHandler.shouldAutoRetry(networkError, 3)).toBe(false);
    });

    it('should retry retryable errors within attempt limit', () => {
      const apiError = {
        category: AmplifyErrorCategory.API,
        code: AmplifyErrorCode.GRAPHQL_EXECUTION_ERROR,
        message: 'Server error',
        isRetryable: true,
        isNetworkError: false,
        timestamp: new Date(),
      };

      expect(AmplifyErrorHandler.shouldAutoRetry(apiError, 1)).toBe(true);
      expect(AmplifyErrorHandler.shouldAutoRetry(apiError, 2)).toBe(true);
    });
  });
});

describe('withAmplifyRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should succeed on first attempt', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await withAmplifyRetry(operation, 'test-context');

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue('success');

    const promise = withAmplifyRetry(operation, 'test-context');
    
    // Fast-forward through retry delay
    vi.advanceTimersByTime(2000);
    
    const result = await promise;

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should not retry non-retryable errors', async () => {
    const authError = {
      name: 'NotAuthorizedException',
      message: 'Invalid credentials'
    };
    const operation = vi.fn().mockRejectedValue(authError);

    await expect(withAmplifyRetry(operation, 'test-context')).rejects.toMatchObject({
      category: AmplifyErrorCategory.AUTH,
      code: AmplifyErrorCode.INVALID_CREDENTIALS,
    });

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should stop retrying after max attempts', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Server error'));

    const promise = withAmplifyRetry(operation, 'test-context', 2);
    
    // Fast-forward through retry delays
    vi.advanceTimersByTime(10000);
    
    await expect(promise).rejects.toThrow();
    expect(operation).toHaveBeenCalledTimes(2);
  });
});

describe('useAmplifyOperation', () => {
  const TestComponent: React.FC<{ operation: () => Promise<string> }> = ({ operation }) => {
    const { data, loading, error, execute, retry } = useAmplifyOperation(operation, 'test-context');

    return (
      <div>
        <button onClick={() => execute()}>Execute</button>
        <button onClick={retry}>Retry</button>
        {loading && <div data-testid="loading">Loading...</div>}
        {error && <div data-testid="error">{error.message}</div>}
        {data && <div data-testid="data">{data}</div>}
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
  });

  it('should handle operation errors', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Test error'));
    render(<TestComponent operation={operation} />);

    fireEvent.click(screen.getByText('Execute'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('data')).not.toBeInTheDocument();
  });

  it('should support retry functionality', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue('success after retry');
    
    render(<TestComponent operation={operation} />);

    fireEvent.click(screen.getByText('Execute'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent('success after retry');
    });
  });
});

describe('useAmplifyMutation', () => {
  const TestMutationComponent: React.FC<{ mutation: (input: string) => Promise<string> }> = ({ mutation }) => {
    const { data, loading, error, mutate } = useAmplifyMutation(mutation, 'mutation-context');

    return (
      <div>
        <button onClick={() => mutate('test input')}>Mutate</button>
        {loading && <div data-testid="loading">Loading...</div>}
        {error && <div data-testid="error">{error.message}</div>}
        {data && <div data-testid="data">{data}</div>}
      </div>
    );
  };

  it('should handle successful mutations', async () => {
    const mutation = vi.fn().mockResolvedValue('mutation result');
    render(<TestMutationComponent mutation={mutation} />);

    fireEvent.click(screen.getByText('Mutate'));

    expect(screen.getByTestId('loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent('mutation result');
    });

    expect(mutation).toHaveBeenCalledWith('test input');
  });

  it('should handle mutation errors', async () => {
    const mutation = vi.fn().mockRejectedValue(new Error('Mutation failed'));
    render(<TestMutationComponent mutation={mutation} />);

    fireEvent.click(screen.getByText('Mutate'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });
  });
});

describe('AmplifyErrorDisplay', () => {
  it('should display error message and suggestions', () => {
    const error = {
      category: AmplifyErrorCategory.AUTH,
      code: AmplifyErrorCode.INVALID_CREDENTIALS,
      message: 'Invalid email or password.',
      isRetryable: false,
      isNetworkError: false,
      timestamp: new Date(),
      suggestions: ['Check your email and password', 'Try resetting your password'],
    };

    render(<AmplifyErrorDisplay error={error} />);

    expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
    expect(screen.getByText('Check your email and password')).toBeInTheDocument();
    expect(screen.getByText('Try resetting your password')).toBeInTheDocument();
  });

  it('should show retry button for retryable errors', () => {
    const error = {
      category: AmplifyErrorCategory.NETWORK,
      code: AmplifyErrorCode.NETWORK_ERROR,
      message: 'Network error occurred.',
      isRetryable: true,
      isNetworkError: true,
      timestamp: new Date(),
    };

    const onRetry = vi.fn();
    render(<AmplifyErrorDisplay error={error} onRetry={onRetry} />);

    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it('should show sign in button for auth errors', () => {
    const error = {
      category: AmplifyErrorCategory.AUTH,
      code: AmplifyErrorCode.USER_NOT_AUTHENTICATED,
      message: 'Authentication required.',
      isRetryable: false,
      isNetworkError: false,
      timestamp: new Date(),
    };

    render(<AmplifyErrorDisplay error={error} />);

    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('should show technical details when requested', () => {
    const error = {
      category: AmplifyErrorCategory.API,
      code: AmplifyErrorCode.GRAPHQL_EXECUTION_ERROR,
      message: 'Server error occurred.',
      isRetryable: true,
      isNetworkError: false,
      timestamp: new Date(),
      details: { serverError: 'Internal server error' },
    };

    render(<AmplifyErrorDisplay error={error} showDetails={true} />);

    expect(screen.getByText('Technical Details')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Technical Details'));
    expect(screen.getByText('GRAPHQL_EXECUTION_ERROR')).toBeInTheDocument();
  });
});

describe('AmplifyErrorToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should auto-dismiss after specified duration', () => {
    const error = {
      category: AmplifyErrorCategory.NETWORK,
      code: AmplifyErrorCode.NETWORK_ERROR,
      message: 'Network error occurred.',
      isRetryable: true,
      isNetworkError: true,
      timestamp: new Date(),
    };

    const onDismiss = vi.fn();
    render(<AmplifyErrorToast error={error} onDismiss={onDismiss} autoHideDuration={3000} />);

    expect(screen.getByText('Network error occurred.')).toBeInTheDocument();

    vi.advanceTimersByTime(3000);

    expect(onDismiss).toHaveBeenCalled();
  });
});

describe('AmplifyLoading', () => {
  it('should show loading state', () => {
    render(
      <AmplifyLoading loading={true} loadingMessage="Loading data...">
        <div>Content</div>
      </AmplifyLoading>
    );

    expect(screen.getByText('Loading data...')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('should show error state', () => {
    render(
      <AmplifyLoading loading={false} error={new Error('Test error')} errorMessage="Failed to load">
        <div>Content</div>
      </AmplifyLoading>
    );

    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('should show content when not loading and no error', () => {
    render(
      <AmplifyLoading loading={false}>
        <div>Content</div>
      </AmplifyLoading>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

describe('LoadingButton', () => {
  it('should show loading state and disable button', () => {
    render(
      <LoadingButton loading={true} loadingText="Saving...">
        Save
      </LoadingButton>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('should show normal state when not loading', () => {
    const onClick = vi.fn();
    render(
      <LoadingButton loading={false} onClick={onClick}>
        Save
      </LoadingButton>
    );

    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
    expect(screen.getByText('Save')).toBeInTheDocument();

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();
  });
});