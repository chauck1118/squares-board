import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError } from 'axios';
import { ErrorHandler, withRetry, isNetworkError, getErrorMessage } from '../utils/errorHandling';

describe('ErrorHandler', () => {
  describe('parseApiError', () => {
    it('should handle network errors', () => {
      const networkError = new AxiosError('Network Error');
      networkError.response = undefined;

      const result = ErrorHandler.parseApiError(networkError);

      expect(result).toEqual({
        message: 'Network error. Please check your connection and try again.',
        code: 'NETWORK_ERROR',
        isNetworkError: true,
        isRetryable: true,
      });
    });

    it('should handle API error responses', () => {
      const apiError = new AxiosError('Request failed');
      apiError.response = {
        status: 400,
        data: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input provided',
            timestamp: '2024-01-01T00:00:00Z',
            path: '/api/test',
          },
        },
      } as any;

      const result = ErrorHandler.parseApiError(apiError);

      expect(result).toEqual({
        message: 'Invalid input provided',
        code: 'VALIDATION_ERROR',
        isNetworkError: false,
        isRetryable: false,
      });
    });

    it('should handle HTTP status errors without API error format', () => {
      const httpError = new AxiosError('Request failed');
      httpError.response = {
        status: 404,
        data: { message: 'Not found' },
      } as any;

      const result = ErrorHandler.parseApiError(httpError);

      expect(result).toEqual({
        message: 'The requested resource was not found.',
        code: 'HTTP_404',
        isNetworkError: false,
        isRetryable: false,
      });
    });

    it('should handle server errors as retryable', () => {
      const serverError = new AxiosError('Server Error');
      serverError.response = {
        status: 500,
        data: {},
      } as any;

      const result = ErrorHandler.parseApiError(serverError);

      expect(result.isRetryable).toBe(true);
    });

    it('should handle rate limiting as retryable', () => {
      const rateLimitError = new AxiosError('Too Many Requests');
      rateLimitError.response = {
        status: 429,
        data: {},
      } as any;

      const result = ErrorHandler.parseApiError(rateLimitError);

      expect(result.isRetryable).toBe(true);
    });

    it('should handle generic errors', () => {
      const genericError = new Error('Something went wrong');

      const result = ErrorHandler.parseApiError(genericError);

      expect(result).toEqual({
        message: 'Something went wrong',
        isNetworkError: false,
        isRetryable: false,
      });
    });

    it('should handle unknown errors', () => {
      const unknownError = 'string error';

      const result = ErrorHandler.parseApiError(unknownError);

      expect(result).toEqual({
        message: 'An unexpected error occurred. Please try again.',
        isNetworkError: false,
        isRetryable: true,
      });
    });
  });

  describe('getRetryDelay', () => {
    it('should calculate exponential backoff delays', () => {
      expect(ErrorHandler.getRetryDelay(1)).toBe(1000);
      expect(ErrorHandler.getRetryDelay(2)).toBe(2000);
      expect(ErrorHandler.getRetryDelay(3)).toBe(4000);
      expect(ErrorHandler.getRetryDelay(4)).toBe(8000);
    });

    it('should cap delay at maximum', () => {
      expect(ErrorHandler.getRetryDelay(10)).toBe(30000);
    });
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should succeed on first attempt', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await withRetry(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const networkError = new AxiosError('Network Error');
    networkError.response = undefined;

    const operation = vi.fn()
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue('success');

    const result = await withRetry(operation, { 
      maxAttempts: 3,
      baseDelay: 10, // Use very short delay for testing
      maxDelay: 50
    });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should not retry on non-retryable errors', async () => {
    const validationError = new AxiosError('Validation Error');
    validationError.response = {
      status: 400,
      data: { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
    } as any;

    const operation = vi.fn().mockRejectedValue(validationError);

    await expect(withRetry(operation)).rejects.toThrow();
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should throw after max attempts', async () => {
    const networkError = new AxiosError('Network Error');
    networkError.response = undefined;

    const operation = vi.fn().mockRejectedValue(networkError);

    await expect(withRetry(operation, { 
      maxAttempts: 2,
      baseDelay: 10, // Use very short delay for testing
      maxDelay: 50
    })).rejects.toThrow();
    
    expect(operation).toHaveBeenCalledTimes(2);
  });
});

describe('utility functions', () => {
  it('should identify network errors', () => {
    const networkError = new AxiosError('Network Error');
    networkError.response = undefined;

    expect(isNetworkError(networkError)).toBe(true);

    const apiError = new AxiosError('API Error');
    apiError.response = { status: 400 } as any;

    expect(isNetworkError(apiError)).toBe(false);
  });

  it('should extract error messages', () => {
    const networkError = new AxiosError('Network Error');
    networkError.response = undefined;

    expect(getErrorMessage(networkError)).toBe('Network error. Please check your connection and try again.');

    const apiError = new AxiosError('API Error');
    apiError.response = {
      status: 400,
      data: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Custom error message',
        },
      },
    } as any;

    expect(getErrorMessage(apiError)).toBe('Custom error message');
  });
});