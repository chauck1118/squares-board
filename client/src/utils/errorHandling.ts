import { AxiosError } from 'axios';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  path: string;
}

export interface ErrorState {
  message: string;
  code?: string;
  isNetworkError: boolean;
  isRetryable: boolean;
}

export class ErrorHandler {
  static parseApiError(error: unknown): ErrorState {
    if (error instanceof AxiosError) {
      // Network error (no response received)
      if (!error.response) {
        return {
          message: 'Network error. Please check your connection and try again.',
          code: 'NETWORK_ERROR',
          isNetworkError: true,
          isRetryable: true,
        };
      }

      // Server responded with error status
      const apiError = error.response.data?.error as ApiError;
      
      if (apiError) {
        return {
          message: apiError.message,
          code: apiError.code,
          isNetworkError: false,
          isRetryable: this.isRetryableError(error.response.status, apiError.code),
        };
      }

      // Fallback for non-API error responses
      return {
        message: this.getStatusMessage(error.response.status),
        code: `HTTP_${error.response.status}`,
        isNetworkError: false,
        isRetryable: this.isRetryableError(error.response.status),
      };
    }

    // Generic error fallback
    if (error instanceof Error) {
      return {
        message: error.message,
        isNetworkError: false,
        isRetryable: false,
      };
    }

    return {
      message: 'An unexpected error occurred. Please try again.',
      isNetworkError: false,
      isRetryable: true,
    };
  }

  private static getStatusMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Authentication required. Please log in and try again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This action conflicts with the current state. Please refresh and try again.';
      case 422:
        return 'The provided data is invalid. Please check your input.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  private static isRetryableError(status?: number, code?: string): boolean {
    if (!status) return true;

    // Network errors and server errors are retryable
    if (status >= 500) return true;
    
    // Rate limiting is retryable after delay
    if (status === 429) return true;

    // Specific error codes that are retryable
    const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT_ERROR'];
    if (code && retryableCodes.includes(code)) return true;

    return false;
  }

  static getRetryDelay(attemptNumber: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    return Math.min(1000 * Math.pow(2, attemptNumber - 1), 30000);
  }
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelay = 1000, maxDelay = 30000 } = options;
  
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const errorState = ErrorHandler.parseApiError(error);
      
      // Don't retry if error is not retryable or this is the last attempt
      if (!errorState.isRetryable || attempt === maxAttempts) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

export function isNetworkError(error: unknown): boolean {
  return ErrorHandler.parseApiError(error).isNetworkError;
}

export function getErrorMessage(error: unknown): string {
  return ErrorHandler.parseApiError(error).message;
}