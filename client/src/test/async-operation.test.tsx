import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AxiosError } from 'axios';
import { useAsyncOperation, useFormSubmission, useDataFetching } from '../hooks/useAsyncOperation';

describe('useAsyncOperation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle successful operation', async () => {
    const mockOperation = vi.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useAsyncOperation(mockOperation));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe('success');
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });

  it('should handle operation errors', async () => {
    const mockError = new AxiosError('Network Error');
    mockError.response = undefined;
    const mockOperation = vi.fn().mockRejectedValue(mockError);
    
    const { result } = renderHook(() => useAsyncOperation(mockOperation));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toEqual({
      message: 'Network error. Please check your connection and try again.',
      code: 'NETWORK_ERROR',
      isNetworkError: true,
      isRetryable: true,
    });
    expect(result.current.isRetryable).toBe(true);
  });

  it('should set loading state during operation', async () => {
    let resolveOperation: (value: string) => void;
    const mockOperation = vi.fn().mockImplementation(() => {
      return new Promise<string>((resolve) => {
        resolveOperation = resolve;
      });
    });

    const { result } = renderHook(() => useAsyncOperation(mockOperation));

    act(() => {
      result.current.execute();
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveOperation!('success');
      await vi.runAllTimersAsync();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe('success');
  });

  it('should retry on retryable errors', async () => {
    const networkError = new AxiosError('Network Error');
    networkError.response = undefined;

    const mockOperation = vi.fn()
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue('success');

    const { result } = renderHook(() => 
      useAsyncOperation(mockOperation, { retryAttempts: 3 })
    );

    const executePromise = act(async () => {
      return result.current.execute();
    });

    // Fast-forward through retry delays
    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    const result_value = await executePromise;

    expect(result_value).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(3);
  });

  it('should call success callback', async () => {
    const mockOperation = vi.fn().mockResolvedValue('success');
    const onSuccess = vi.fn();
    
    const { result } = renderHook(() => 
      useAsyncOperation(mockOperation, { onSuccess })
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(onSuccess).toHaveBeenCalledWith('success');
  });

  it('should call error callback', async () => {
    const mockError = new Error('Test error');
    const mockOperation = vi.fn().mockRejectedValue(mockError);
    const onError = vi.fn();
    
    const { result } = renderHook(() => 
      useAsyncOperation(mockOperation, { onError })
    );

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Expected to throw
      }
    });

    expect(onError).toHaveBeenCalledWith({
      message: 'Test error',
      isNetworkError: false,
      isRetryable: false,
    });
  });

  it('should reset state', async () => {
    const mockOperation = vi.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useAsyncOperation(mockOperation));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toBe('success');

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdated).toBeNull();
  });

  it('should retry with retry function', async () => {
    const mockOperation = vi.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useAsyncOperation(mockOperation));

    await act(async () => {
      await result.current.retry();
    });

    expect(result.current.data).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });
});

describe('useFormSubmission', () => {
  it('should handle form submission', async () => {
    const mockSubmit = vi.fn().mockResolvedValue({ id: 1, name: 'Test' });
    const { result } = renderHook(() => useFormSubmission(mockSubmit));

    expect(result.current.isSubmitting).toBe(false);

    await act(async () => {
      await result.current.submit({ name: 'Test' });
    });

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.data).toEqual({ id: 1, name: 'Test' });
    expect(mockSubmit).toHaveBeenCalledWith({ name: 'Test' });
  });

  it('should handle submission errors', async () => {
    const mockError = new Error('Submission failed');
    const mockSubmit = vi.fn().mockRejectedValue(mockError);
    const { result } = renderHook(() => useFormSubmission(mockSubmit));

    await act(async () => {
      try {
        await result.current.submit({ name: 'Test' });
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toEqual({
      message: 'Submission failed',
      isNetworkError: false,
      isRetryable: false,
    });
  });

  it('should set submitting state during submission', async () => {
    let resolveSubmission: (value: any) => void;
    const mockSubmit = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolveSubmission = resolve;
      });
    });

    const { result } = renderHook(() => useFormSubmission(mockSubmit));

    act(() => {
      result.current.submit({ name: 'Test' });
    });

    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      resolveSubmission!({ id: 1 });
    });

    expect(result.current.isSubmitting).toBe(false);
  });
});

describe('useDataFetching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch data immediately by default', async () => {
    const mockFetch = vi.fn().mockResolvedValue('data');
    const { result } = renderHook(() => useDataFetching(mockFetch));

    await waitFor(() => {
      expect(result.current.data).toBe('data');
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should not fetch immediately when immediate is false', async () => {
    const mockFetch = vi.fn().mockResolvedValue('data');
    const { result } = renderHook(() => 
      useDataFetching(mockFetch, [], { immediate: false })
    );

    expect(result.current.data).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should refetch when dependencies change', async () => {
    const mockFetch = vi.fn().mockResolvedValue('data');
    let dependency = 'initial';
    
    const { result, rerender } = renderHook(() => 
      useDataFetching(mockFetch, [dependency])
    );

    await waitFor(() => {
      expect(result.current.data).toBe('data');
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    dependency = 'changed';
    rerender();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should use cached data within cache time', async () => {
    const mockFetch = vi.fn().mockResolvedValue('data');
    const { result } = renderHook(() => 
      useDataFetching(mockFetch, [], { cacheTime: 10000 })
    );

    await waitFor(() => {
      expect(result.current.data).toBe('data');
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.fetch();
    });

    // Should not call fetch again due to caching
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.isCached).toBe(true);
  });

  it('should force refetch when requested', async () => {
    const mockFetch = vi.fn().mockResolvedValue('data');
    const { result } = renderHook(() => 
      useDataFetching(mockFetch, [], { cacheTime: 10000 })
    );

    await waitFor(() => {
      expect(result.current.data).toBe('data');
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    // Should call fetch again due to force refetch
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});