import { GraphQLError } from 'graphql';

/**
 * AWS Amplify Error Categories
 * Based on AWS Amplify error types and GraphQL error extensions
 */
export enum AmplifyErrorCategory {
  AUTH = 'AUTH',
  API = 'API',
  DATASTORE = 'DATASTORE',
  STORAGE = 'STORAGE',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHORIZATION = 'AUTHORIZATION',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN',
}

/**
 * AWS Amplify Error Codes
 * Specific error codes for different scenarios
 */
export enum AmplifyErrorCode {
  // Authentication errors
  USER_NOT_AUTHENTICATED = 'USER_NOT_AUTHENTICATED',
  USER_NOT_CONFIRMED = 'USER_NOT_CONFIRMED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  PASSWORD_RESET_REQUIRED = 'PASSWORD_RESET_REQUIRED',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  
  // Authorization errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // API/GraphQL errors
  GRAPHQL_VALIDATION_ERROR = 'GRAPHQL_VALIDATION_ERROR',
  GRAPHQL_EXECUTION_ERROR = 'GRAPHQL_EXECUTION_ERROR',
  RESOLVER_ERROR = 'RESOLVER_ERROR',
  
  // DataStore errors
  DATASTORE_SYNC_ERROR = 'DATASTORE_SYNC_ERROR',
  DATASTORE_CONFLICT = 'DATASTORE_CONFLICT',
  DATASTORE_OFFLINE = 'DATASTORE_OFFLINE',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  
  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  FIELD_VALIDATION_ERROR = 'FIELD_VALIDATION_ERROR',
  
  // Business logic errors
  BOARD_FULL = 'BOARD_FULL',
  SQUARE_ALREADY_CLAIMED = 'SQUARE_ALREADY_CLAIMED',
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  INVALID_BOARD_STATUS = 'INVALID_BOARD_STATUS',
  MAX_SQUARES_EXCEEDED = 'MAX_SQUARES_EXCEEDED',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Generic
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Enhanced error state for AWS Amplify operations
 */
export interface AmplifyErrorState {
  category: AmplifyErrorCategory;
  code: AmplifyErrorCode;
  message: string;
  details?: any;
  isRetryable: boolean;
  isNetworkError: boolean;
  timestamp: Date;
  path?: string;
  suggestions?: string[];
}

/**
 * AWS Amplify Error Handler
 * Provides comprehensive error parsing and categorization for Amplify operations
 */
export class AmplifyErrorHandler {
  /**
   * Parse any error into a structured AmplifyErrorState
   */
  static parseError(error: unknown, context?: string): AmplifyErrorState {
    const timestamp = new Date();
    
    // Handle GraphQL errors from AWS AppSync
    if (this.isGraphQLError(error)) {
      return this.parseGraphQLError(error, timestamp, context);
    }
    
    // Handle AWS Amplify Auth errors
    if (this.isAmplifyAuthError(error)) {
      return this.parseAuthError(error, timestamp, context);
    }
    
    // Handle AWS Amplify DataStore errors
    if (this.isDataStoreError(error)) {
      return this.parseDataStoreError(error, timestamp, context);
    }
    
    // Handle network errors
    if (this.isNetworkError(error)) {
      return this.parseNetworkError(error, timestamp, context);
    }
    
    // Handle generic JavaScript errors
    if (error instanceof Error) {
      return this.parseGenericError(error, timestamp, context);
    }
    
    // Fallback for unknown error types
    return {
      category: AmplifyErrorCategory.UNKNOWN,
      code: AmplifyErrorCode.UNKNOWN_ERROR,
      message: 'An unexpected error occurred. Please try again.',
      isRetryable: true,
      isNetworkError: false,
      timestamp,
      path: context,
      suggestions: ['Try refreshing the page', 'Check your internet connection'],
    };
  }

  /**
   * Parse GraphQL errors from AWS AppSync
   */
  private static parseGraphQLError(error: any, timestamp: Date, context?: string): AmplifyErrorState {
    const graphqlError = error.errors?.[0] || error;
    const extensions = graphqlError.extensions || {};
    const errorType = extensions.errorType || extensions.code;
    
    // Handle authorization errors
    if (errorType === 'Unauthorized' || extensions.code === 'UNAUTHORIZED') {
      return {
        category: AmplifyErrorCategory.AUTHORIZATION,
        code: AmplifyErrorCode.UNAUTHORIZED,
        message: 'You are not authorized to perform this action.',
        isRetryable: false,
        isNetworkError: false,
        timestamp,
        path: context,
        suggestions: ['Please log in again', 'Contact an administrator if you believe this is an error'],
      };
    }
    
    // Handle validation errors
    if (errorType === 'ValidationException' || extensions.code === 'VALIDATION_ERROR') {
      return {
        category: AmplifyErrorCategory.VALIDATION,
        code: AmplifyErrorCode.GRAPHQL_VALIDATION_ERROR,
        message: graphqlError.message || 'Invalid input provided.',
        details: extensions.validationErrors,
        isRetryable: false,
        isNetworkError: false,
        timestamp,
        path: context,
        suggestions: ['Check your input and try again'],
      };
    }
    
    // Handle conflict errors (optimistic locking)
    if (errorType === 'ConditionalCheckFailedException' || extensions.code === 'CONFLICT') {
      return {
        category: AmplifyErrorCategory.CONFLICT,
        code: AmplifyErrorCode.DATASTORE_CONFLICT,
        message: 'This item was modified by another user. Please refresh and try again.',
        isRetryable: true,
        isNetworkError: false,
        timestamp,
        path: context,
        suggestions: ['Refresh the page and try again', 'Your changes may have been overwritten'],
      };
    }
    
    // Handle rate limiting
    if (errorType === 'TooManyRequestsException' || extensions.code === 'RATE_LIMIT') {
      return {
        category: AmplifyErrorCategory.RATE_LIMIT,
        code: AmplifyErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Too many requests. Please wait a moment and try again.',
        isRetryable: true,
        isNetworkError: false,
        timestamp,
        path: context,
        suggestions: ['Wait a few seconds and try again'],
      };
    }
    
    // Generic GraphQL error
    return {
      category: AmplifyErrorCategory.API,
      code: AmplifyErrorCode.GRAPHQL_EXECUTION_ERROR,
      message: graphqlError.message || 'A server error occurred.',
      details: extensions,
      isRetryable: true,
      isNetworkError: false,
      timestamp,
      path: context,
      suggestions: ['Try again in a moment', 'Contact support if the problem persists'],
    };
  }

  /**
   * Parse AWS Amplify Auth errors
   */
  private static parseAuthError(error: any, timestamp: Date, context?: string): AmplifyErrorState {
    const errorCode = error.name || error.code;
    const message = error.message || 'Authentication error occurred.';
    
    switch (errorCode) {
      case 'UserNotConfirmedException':
        return {
          category: AmplifyErrorCategory.AUTH,
          code: AmplifyErrorCode.USER_NOT_CONFIRMED,
          message: 'Please confirm your email address before signing in.',
          isRetryable: false,
          isNetworkError: false,
          timestamp,
          path: context,
          suggestions: ['Check your email for a confirmation link', 'Resend confirmation email'],
        };
        
      case 'NotAuthorizedException':
      case 'UserNotFoundException':
        return {
          category: AmplifyErrorCategory.AUTH,
          code: AmplifyErrorCode.INVALID_CREDENTIALS,
          message: 'Invalid email or password.',
          isRetryable: false,
          isNetworkError: false,
          timestamp,
          path: context,
          suggestions: ['Check your email and password', 'Try resetting your password'],
        };
        
      case 'UsernameExistsException':
        return {
          category: AmplifyErrorCategory.AUTH,
          code: AmplifyErrorCode.USER_ALREADY_EXISTS,
          message: 'An account with this email already exists.',
          isRetryable: false,
          isNetworkError: false,
          timestamp,
          path: context,
          suggestions: ['Try signing in instead', 'Use a different email address'],
        };
        
      case 'PasswordResetRequiredException':
        return {
          category: AmplifyErrorCategory.AUTH,
          code: AmplifyErrorCode.PASSWORD_RESET_REQUIRED,
          message: 'Password reset is required.',
          isRetryable: false,
          isNetworkError: false,
          timestamp,
          path: context,
          suggestions: ['Reset your password', 'Contact support for assistance'],
        };
        
      default:
        return {
          category: AmplifyErrorCategory.AUTH,
          code: AmplifyErrorCode.USER_NOT_AUTHENTICATED,
          message,
          isRetryable: false,
          isNetworkError: false,
          timestamp,
          path: context,
          suggestions: ['Try signing in again', 'Clear your browser cache'],
        };
    }
  }

  /**
   * Parse AWS Amplify DataStore errors
   */
  private static parseDataStoreError(error: any, timestamp: Date, context?: string): AmplifyErrorState {
    const errorType = error.errorType || error.name;
    
    if (errorType === 'DataStoreConflictError') {
      return {
        category: AmplifyErrorCategory.DATASTORE,
        code: AmplifyErrorCode.DATASTORE_CONFLICT,
        message: 'Data conflict detected. Your changes may have been overwritten.',
        details: error.localModel && error.serverModel ? {
          local: error.localModel,
          server: error.serverModel,
        } : undefined,
        isRetryable: true,
        isNetworkError: false,
        timestamp,
        path: context,
        suggestions: ['Refresh and try again', 'Your local changes may be lost'],
      };
    }
    
    return {
      category: AmplifyErrorCategory.DATASTORE,
      code: AmplifyErrorCode.DATASTORE_SYNC_ERROR,
      message: error.message || 'Data synchronization error occurred.',
      isRetryable: true,
      isNetworkError: false,
      timestamp,
      path: context,
      suggestions: ['Check your internet connection', 'Try again in a moment'],
    };
  }

  /**
   * Parse network errors
   */
  private static parseNetworkError(error: any, timestamp: Date, context?: string): AmplifyErrorState {
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      return {
        category: AmplifyErrorCategory.NETWORK,
        code: AmplifyErrorCode.NETWORK_ERROR,
        message: 'Network error. Please check your connection and try again.',
        isRetryable: true,
        isNetworkError: true,
        timestamp,
        path: context,
        suggestions: ['Check your internet connection', 'Try again in a moment'],
      };
    }
    
    if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
      return {
        category: AmplifyErrorCategory.NETWORK,
        code: AmplifyErrorCode.TIMEOUT_ERROR,
        message: 'Request timed out. Please try again.',
        isRetryable: true,
        isNetworkError: true,
        timestamp,
        path: context,
        suggestions: ['Try again', 'Check your internet connection'],
      };
    }
    
    return {
      category: AmplifyErrorCategory.NETWORK,
      code: AmplifyErrorCode.CONNECTION_FAILED,
      message: 'Connection failed. Please try again.',
      isRetryable: true,
      isNetworkError: true,
      timestamp,
      path: context,
      suggestions: ['Check your internet connection', 'Try again in a moment'],
    };
  }

  /**
   * Parse generic JavaScript errors
   */
  private static parseGenericError(error: Error, timestamp: Date, context?: string): AmplifyErrorState {
    return {
      category: AmplifyErrorCategory.UNKNOWN,
      code: AmplifyErrorCode.UNKNOWN_ERROR,
      message: error.message || 'An unexpected error occurred.',
      isRetryable: true,
      isNetworkError: false,
      timestamp,
      path: context,
      suggestions: ['Try refreshing the page', 'Contact support if the problem persists'],
    };
  }

  /**
   * Type guards for error detection
   */
  private static isGraphQLError(error: any): boolean {
    return error?.errors || error?.extensions || error?.graphQLErrors;
  }

  private static isAmplifyAuthError(error: any): boolean {
    const authErrorNames = [
      'UserNotConfirmedException',
      'NotAuthorizedException',
      'UserNotFoundException',
      'UsernameExistsException',
      'PasswordResetRequiredException',
      'InvalidParameterException',
      'CodeMismatchException',
      'ExpiredCodeException',
    ];
    
    return authErrorNames.includes(error?.name) || authErrorNames.includes(error?.code);
  }

  private static isDataStoreError(error: any): boolean {
    return error?.errorType === 'DataStoreConflictError' || 
           error?.name?.includes('DataStore') ||
           error?.message?.includes('DataStore');
  }

  private static isNetworkError(error: any): boolean {
    return error?.code === 'NETWORK_ERROR' ||
           error?.message?.includes('Network Error') ||
           error?.message?.includes('timeout') ||
           error?.code === 'TIMEOUT' ||
           !navigator.onLine;
  }

  /**
   * Get retry delay based on error type and attempt number
   */
  static getRetryDelay(error: AmplifyErrorState, attemptNumber: number): number {
    if (error.category === AmplifyErrorCategory.RATE_LIMIT) {
      // Longer delay for rate limiting
      return Math.min(5000 * Math.pow(2, attemptNumber - 1), 60000); // 5s, 10s, 20s, max 60s
    }
    
    if (error.isNetworkError) {
      // Shorter delay for network errors
      return Math.min(1000 * Math.pow(2, attemptNumber - 1), 10000); // 1s, 2s, 4s, max 10s
    }
    
    // Standard exponential backoff
    return Math.min(2000 * Math.pow(2, attemptNumber - 1), 30000); // 2s, 4s, 8s, max 30s
  }

  /**
   * Check if error should trigger automatic retry
   */
  static shouldAutoRetry(error: AmplifyErrorState, attemptNumber: number): boolean {
    if (attemptNumber >= 3) return false;
    if (!error.isRetryable) return false;
    
    // Don't auto-retry auth or validation errors
    if (error.category === AmplifyErrorCategory.AUTH || 
        error.category === AmplifyErrorCategory.VALIDATION) {
      return false;
    }
    
    return true;
  }

  /**
   * Get user-friendly error message with suggestions
   */
  static getUserMessage(error: AmplifyErrorState): string {
    let message = error.message;
    
    if (error.suggestions && error.suggestions.length > 0) {
      message += '\n\nSuggestions:\n• ' + error.suggestions.join('\n• ');
    }
    
    return message;
  }
}

/**
 * Retry function with AWS Amplify error handling
 */
export async function withAmplifyRetry<T>(
  operation: () => Promise<T>,
  context?: string,
  maxAttempts: number = 3
): Promise<T> {
  let lastError: AmplifyErrorState;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = AmplifyErrorHandler.parseError(error, context);
      
      // Don't retry if error is not retryable or this is the last attempt
      if (!AmplifyErrorHandler.shouldAutoRetry(lastError, attempt) || attempt === maxAttempts) {
        throw lastError;
      }
      
      // Wait before retrying
      const delay = AmplifyErrorHandler.getRetryDelay(lastError, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}