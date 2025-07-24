import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'white' | 'gray' | 'green' | 'red';
  className?: string;
  message?: string;
  showMessage?: boolean;
  overlay?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'blue',
  className = '',
  message = 'Loading...',
  showMessage = false,
  overlay = false,
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };
  
  const colorClasses = {
    blue: 'border-blue-600',
    white: 'border-white',
    gray: 'border-gray-300',
    green: 'border-green-600',
    red: 'border-red-600',
  };

  const textColorClasses = {
    blue: 'text-blue-600',
    white: 'text-white',
    gray: 'text-gray-600',
    green: 'text-green-600',
    red: 'text-red-600',
  };
  
  const spinner = (
    <div 
      data-testid="loading-spinner"
      className={`animate-spin rounded-full border-b-2 ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
    />
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-4">
          {spinner}
          {showMessage && (
            <p className="text-gray-700 text-sm font-medium">{message}</p>
          )}
        </div>
      </div>
    );
  }

  if (showMessage) {
    return (
      <div className="flex flex-col items-center space-y-2">
        {spinner}
        <p className={`text-sm font-medium ${textColorClasses[color]}`}>{message}</p>
      </div>
    );
  }

  return spinner;
};

/**
 * Loading state component for AWS Amplify operations
 */
interface AmplifyLoadingProps {
  loading: boolean;
  error?: any;
  children: React.ReactNode;
  loadingMessage?: string;
  errorMessage?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  overlay?: boolean;
}

export const AmplifyLoading: React.FC<AmplifyLoadingProps> = ({
  loading,
  error,
  children,
  loadingMessage = 'Loading...',
  errorMessage = 'Something went wrong',
  size = 'md',
  overlay = false,
}) => {
  if (loading) {
    return (
      <LoadingSpinner
        size={size}
        message={loadingMessage}
        showMessage={true}
        overlay={overlay}
      />
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <div className="text-red-600 mb-2">
          <svg className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-700 text-sm">{errorMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Button loading state component
 */
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading,
  loadingText = 'Loading...',
  children,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={loading || disabled}
      className={`relative ${className} ${loading ? 'cursor-not-allowed' : ''}`}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="sm" color="white" />
          {loadingText && (
            <span className="ml-2 text-sm">{loadingText}</span>
          )}
        </div>
      )}
      <div className={loading ? 'invisible' : 'visible'}>
        {children}
      </div>
    </button>
  );
};

export default LoadingSpinner;