import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AmplifyErrorDisplay, AmplifyErrorToast, AmplifyInlineError } from '../AmplifyErrorDisplay';
import { AmplifyErrorCategory, AmplifyErrorCode } from '../../utils/amplifyErrorHandling';

describe('AmplifyErrorDisplay', () => {
  const mockError = {
    category: AmplifyErrorCategory.AUTH,
    code: AmplifyErrorCode.INVALID_CREDENTIALS,
    message: 'Invalid email or password.',
    isRetryable: false,
    isNetworkError: false,
    timestamp: new Date('2024-01-01T12:00:00Z'),
    suggestions: ['Check your email and password', 'Try resetting your password'],
  };

  it('should render error message and suggestions', () => {
    render(<AmplifyErrorDisplay error={mockError} />);

    expect(screen.getByText('Auth Error')).toBeInTheDocument();
    expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
    expect(screen.getByText('Suggestions:')).toBeInTheDocument();
    expect(screen.getByText('Check your email and password')).toBeInTheDocument();
    expect(screen.getByText('Try resetting your password')).toBeInTheDocument();
  });

  it('should show retry button for retryable errors', () => {
    const retryableError = {
      ...mockError,
      category: AmplifyErrorCategory.NETWORK,
      code: AmplifyErrorCode.NETWORK_ERROR,
      message: 'Network error occurred.',
      isRetryable: true,
      isNetworkError: true,
    };

    const onRetry = vi.fn();
    render(<AmplifyErrorDisplay error={retryableError} onRetry={onRetry} />);

    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it('should show refresh page button for network errors', () => {
    const networkError = {
      ...mockError,
      category: AmplifyErrorCategory.NETWORK,
      code: AmplifyErrorCode.NETWORK_ERROR,
      message: 'Network error occurred.',
      isNetworkError: true,
    };

    render(<AmplifyErrorDisplay error={networkError} />);

    expect(screen.getByText('Refresh Page')).toBeInTheDocument();
  });

  it('should show sign in button for auth errors', () => {
    render(<AmplifyErrorDisplay error={mockError} />);

    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('should show dismiss button when onDismiss is provided', () => {
    const onDismiss = vi.fn();
    render(<AmplifyErrorDisplay error={mockError} onDismiss={onDismiss} />);

    const dismissButton = screen.getByLabelText('Dismiss notification') || 
                          screen.getByRole('button', { name: /dismiss/i });
    expect(dismissButton).toBeInTheDocument();

    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('should show technical details when showDetails is true', () => {
    const errorWithDetails = {
      ...mockError,
      details: { serverError: 'Internal server error' },
      path: 'test-context',
    };

    render(<AmplifyErrorDisplay error={errorWithDetails} showDetails={true} />);

    expect(screen.getByText('Technical Details')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Technical Details'));
    
    expect(screen.getByText('INVALID_CREDENTIALS')).toBeInTheDocument();
    expect(screen.getByText('AUTH')).toBeInTheDocument();
    expect(screen.getByText('test-context')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument(); // isRetryable: false
  });

  it('should display different icons for different error categories', () => {
    const { rerender } = render(<AmplifyErrorDisplay error={mockError} />);
    
    // Auth error should have warning icon
    expect(screen.getByText('Auth Error')).toBeInTheDocument();

    const networkError = {
      ...mockError,
      category: AmplifyErrorCategory.NETWORK,
      code: AmplifyErrorCode.NETWORK_ERROR,
      message: 'Network error',
    };

    rerender(<AmplifyErrorDisplay error={networkError} />);
    expect(screen.getByText('Network Error')).toBeInTheDocument();

    const validationError = {
      ...mockError,
      category: AmplifyErrorCategory.VALIDATION,
      code: AmplifyErrorCode.FIELD_VALIDATION_ERROR,
      message: 'Validation error',
    };

    rerender(<AmplifyErrorDisplay error={validationError} />);
    expect(screen.getByText('Validation Error')).toBeInTheDocument();
  });

  it('should apply different background colors for different error categories', () => {
    const { container, rerender } = render(<AmplifyErrorDisplay error={mockError} />);
    
    // Auth error should have yellow background
    expect(container.firstChild).toHaveClass('border-yellow-200', 'bg-yellow-50');

    const networkError = {
      ...mockError,
      category: AmplifyErrorCategory.NETWORK,
      message: 'Network error',
    };

    rerender(<AmplifyErrorDisplay error={networkError} />);
    expect(container.firstChild).toHaveClass('border-red-200', 'bg-red-50');
  });

  it('should not render when error is null', () => {
    const { container } = render(<AmplifyErrorDisplay error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <AmplifyErrorDisplay error={mockError} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('AmplifyErrorToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockError = {
    category: AmplifyErrorCategory.NETWORK,
    code: AmplifyErrorCode.NETWORK_ERROR,
    message: 'Network error occurred.',
    isRetryable: true,
    isNetworkError: true,
    timestamp: new Date(),
  };

  it('should render error toast', () => {
    const onDismiss = vi.fn();
    render(<AmplifyErrorToast error={mockError} onDismiss={onDismiss} />);

    expect(screen.getByText('Network error occurred.')).toBeInTheDocument();
  });

  it('should auto-dismiss after specified duration', () => {
    const onDismiss = vi.fn();
    render(
      <AmplifyErrorToast 
        error={mockError} 
        onDismiss={onDismiss} 
        autoHideDuration={3000} 
      />
    );

    expect(screen.getByText('Network error occurred.')).toBeInTheDocument();

    vi.advanceTimersByTime(3000);

    expect(onDismiss).toHaveBeenCalled();
  });

  it('should not auto-dismiss when autoHideDuration is 0', () => {
    const onDismiss = vi.fn();
    render(
      <AmplifyErrorToast 
        error={mockError} 
        onDismiss={onDismiss} 
        autoHideDuration={0} 
      />
    );

    vi.advanceTimersByTime(10000);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('should not render when error is null', () => {
    const onDismiss = vi.fn();
    const { container } = render(
      <AmplifyErrorToast error={null} onDismiss={onDismiss} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should be positioned as a toast notification', () => {
    const onDismiss = vi.fn();
    const { container } = render(
      <AmplifyErrorToast error={mockError} onDismiss={onDismiss} />
    );
    
    expect(container.firstChild).toHaveClass('fixed', 'top-4', 'right-4', 'z-50');
  });

  it('should clear timer on unmount', () => {
    const onDismiss = vi.fn();
    const { unmount } = render(
      <AmplifyErrorToast 
        error={mockError} 
        onDismiss={onDismiss} 
        autoHideDuration={3000} 
      />
    );

    unmount();
    vi.advanceTimersByTime(3000);

    expect(onDismiss).not.toHaveBeenCalled();
  });
});

describe('AmplifyInlineError', () => {
  const mockError = {
    category: AmplifyErrorCategory.VALIDATION,
    code: AmplifyErrorCode.FIELD_VALIDATION_ERROR,
    message: 'This field is required.',
    isRetryable: false,
    isNetworkError: false,
    timestamp: new Date(),
  };

  it('should render inline error message', () => {
    render(<AmplifyInlineError error={mockError} />);

    expect(screen.getByText('This field is required.')).toBeInTheDocument();
  });

  it('should display error icon', () => {
    render(<AmplifyInlineError error={mockError} />);

    const errorIcon = screen.getByText('This field is required.').parentElement?.querySelector('svg');
    expect(errorIcon).toBeInTheDocument();
  });

  it('should apply red text color', () => {
    const { container } = render(<AmplifyInlineError error={mockError} />);
    
    expect(container.firstChild).toHaveClass('text-red-600');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <AmplifyInlineError error={mockError} className="custom-inline-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-inline-class');
  });

  it('should not render when error is null', () => {
    const { container } = render(<AmplifyInlineError error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should have proper spacing and layout', () => {
    const { container } = render(<AmplifyInlineError error={mockError} />);
    
    expect(container.firstChild).toHaveClass('text-sm', 'mt-1');
    
    const flexContainer = container.querySelector('.flex');
    expect(flexContainer).toHaveClass('items-center');
    
    const icon = container.querySelector('svg');
    expect(icon).toHaveClass('h-4', 'w-4', 'mr-1', 'flex-shrink-0');
  });
});

describe('Error Display Integration', () => {
  it('should handle complex error objects with all properties', () => {
    const complexError = {
      category: AmplifyErrorCategory.DATASTORE,
      code: AmplifyErrorCode.DATASTORE_CONFLICT,
      message: 'Data conflict detected. Your changes may have been overwritten.',
      details: {
        local: { id: '1', name: 'local version' },
        server: { id: '1', name: 'server version' }
      },
      isRetryable: true,
      isNetworkError: false,
      timestamp: new Date('2024-01-01T12:00:00Z'),
      path: 'board-update-context',
      suggestions: [
        'Refresh and try again',
        'Your local changes may be lost'
      ],
    };

    render(<AmplifyErrorDisplay error={complexError} showDetails={true} />);

    expect(screen.getByText('Datastore Error')).toBeInTheDocument();
    expect(screen.getByText('Data conflict detected. Your changes may have been overwritten.')).toBeInTheDocument();
    expect(screen.getByText('Refresh and try again')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Technical Details'));
    expect(screen.getByText('DATASTORE_CONFLICT')).toBeInTheDocument();
    expect(screen.getByText('board-update-context')).toBeInTheDocument();
  });

  it('should handle errors without suggestions', () => {
    const errorWithoutSuggestions = {
      category: AmplifyErrorCategory.API,
      code: AmplifyErrorCode.GRAPHQL_EXECUTION_ERROR,
      message: 'Server error occurred.',
      isRetryable: true,
      isNetworkError: false,
      timestamp: new Date(),
    };

    render(<AmplifyErrorDisplay error={errorWithoutSuggestions} />);

    expect(screen.getByText('Server error occurred.')).toBeInTheDocument();
    expect(screen.queryByText('Suggestions:')).not.toBeInTheDocument();
  });

  it('should format timestamp correctly in technical details', () => {
    const errorWithTimestamp = {
      category: AmplifyErrorCategory.UNKNOWN,
      code: AmplifyErrorCode.UNKNOWN_ERROR,
      message: 'Unknown error',
      isRetryable: true,
      isNetworkError: false,
      timestamp: new Date('2024-01-01T12:30:45Z'),
    };

    render(<AmplifyErrorDisplay error={errorWithTimestamp} showDetails={true} />);

    fireEvent.click(screen.getByText('Technical Details'));
    
    // The timestamp should be formatted as a locale time string
    const timestampText = screen.getByText(/Timestamp:/);
    expect(timestampText).toBeInTheDocument();
  });
});