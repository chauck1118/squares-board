import React from 'react';
import { AmplifyErrorState, AmplifyErrorCategory, AmplifyErrorHandler } from '../utils/amplifyErrorHandling';

interface AmplifyErrorDisplayProps {
  error: AmplifyErrorState | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  showDetails?: boolean;
}

/**
 * Component for displaying AWS Amplify errors with user-friendly messages and actions
 */
export const AmplifyErrorDisplay: React.FC<AmplifyErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  className = '',
  showDetails = false,
}) => {
  if (!error) return null;

  const getErrorIcon = (category: AmplifyErrorCategory): JSX.Element => {
    const iconClass = "h-5 w-5";
    
    switch (category) {
      case AmplifyErrorCategory.AUTH:
        return (
          <svg className={`${iconClass} text-yellow-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case AmplifyErrorCategory.NETWORK:
        return (
          <svg className={`${iconClass} text-red-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
          </svg>
        );
      case AmplifyErrorCategory.VALIDATION:
        return (
          <svg className={`${iconClass} text-orange-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case AmplifyErrorCategory.AUTHORIZATION:
        return (
          <svg className={`${iconClass} text-red-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636" />
          </svg>
        );
      case AmplifyErrorCategory.CONFLICT:
        return (
          <svg className={`${iconClass} text-yellow-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      default:
        return (
          <svg className={`${iconClass} text-red-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getErrorColor = (category: AmplifyErrorCategory): string => {
    switch (category) {
      case AmplifyErrorCategory.AUTH:
        return 'border-yellow-200 bg-yellow-50';
      case AmplifyErrorCategory.NETWORK:
        return 'border-red-200 bg-red-50';
      case AmplifyErrorCategory.VALIDATION:
        return 'border-orange-200 bg-orange-50';
      case AmplifyErrorCategory.AUTHORIZATION:
        return 'border-red-200 bg-red-50';
      case AmplifyErrorCategory.CONFLICT:
        return 'border-yellow-200 bg-yellow-50';
      case AmplifyErrorCategory.RATE_LIMIT:
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-red-200 bg-red-50';
    }
  };

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString();
  };

  return (
    <div className={`rounded-md border p-4 ${getErrorColor(error.category)} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {getErrorIcon(error.category)}
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-800">
              {error.category.charAt(0) + error.category.slice(1).toLowerCase()} Error
            </h3>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="mt-2 text-sm text-gray-700">
            <p>{error.message}</p>
          </div>

          {error.suggestions && error.suggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-800">Suggestions:</p>
              <ul className="mt-1 text-sm text-gray-700 list-disc list-inside">
                {error.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {showDetails && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                Technical Details
              </summary>
              <div className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-800 font-mono">
                <div className="mb-2">
                  <strong>Code:</strong> {error.code}
                </div>
                <div className="mb-2">
                  <strong>Category:</strong> {error.category}
                </div>
                <div className="mb-2">
                  <strong>Timestamp:</strong> {formatTimestamp(error.timestamp)}
                </div>
                {error.path && (
                  <div className="mb-2">
                    <strong>Context:</strong> {error.path}
                  </div>
                )}
                <div className="mb-2">
                  <strong>Retryable:</strong> {error.isRetryable ? 'Yes' : 'No'}
                </div>
                <div className="mb-2">
                  <strong>Network Error:</strong> {error.isNetworkError ? 'Yes' : 'No'}
                </div>
                {error.details && (
                  <div>
                    <strong>Details:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(error.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            </details>
          )}

          <div className="mt-4 flex space-x-3">
            {onRetry && error.isRetryable && (
              <button
                onClick={onRetry}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Try Again
              </button>
            )}
            
            {error.isNetworkError && (
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Refresh Page
              </button>
            )}

            {error.category === AmplifyErrorCategory.AUTH && (
              <button
                onClick={() => window.location.href = '/login'}
                className="bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Toast notification component for errors
 */
interface AmplifyErrorToastProps {
  error: AmplifyErrorState | null;
  onDismiss: () => void;
  autoHideDuration?: number;
}

export const AmplifyErrorToast: React.FC<AmplifyErrorToastProps> = ({
  error,
  onDismiss,
  autoHideDuration = 5000,
}) => {
  React.useEffect(() => {
    if (error && autoHideDuration > 0) {
      const timer = setTimeout(onDismiss, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [error, onDismiss, autoHideDuration]);

  if (!error) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <AmplifyErrorDisplay
        error={error}
        onDismiss={onDismiss}
        className="shadow-lg"
      />
    </div>
  );
};

/**
 * Inline error component for forms
 */
interface AmplifyInlineErrorProps {
  error: AmplifyErrorState | null;
  className?: string;
}

export const AmplifyInlineError: React.FC<AmplifyInlineErrorProps> = ({
  error,
  className = '',
}) => {
  if (!error) return null;

  return (
    <div className={`text-sm text-red-600 mt-1 ${className}`}>
      <div className="flex items-center">
        <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{error.message}</span>
      </div>
    </div>
  );
};