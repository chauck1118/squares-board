import { useState, useCallback, useRef, useEffect } from 'react';
import { ErrorHandler, withRetry, ErrorState } from '../utils/errorHandling';

interface AsyncOperationState<T> {
  data: T | null;
  loading: boolean;
  error: ErrorState | null;
  lastUpdated: Date | null;
}

interface AsyncOperationOptions {
  retryAttempts?: number;
  retryDelay?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: ErrorState) => void;
}

export function useAsyncOperation<T>(
  operation: () => Promise<T>,
  options: AsyncOperationOptions = {}
) {
  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const execute = useCallback(async (): Promise<T | null> => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const result = await withRetry(operation, {
        maxAttempts: options.retryAttempts || 3,
        baseDelay: options.retryDelay || 1000,
      });

      if (!mountedRef.current) return null;

      setState({
        data: result,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });

      if (options.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (error) {
      if (!mountedRef.current) return null;

      const errorState = ErrorHandler.parseApiError(error);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorState,
      }));

      if (options.onError) {
        options.onError(errorState);
      }

      throw error;
    } finally {
      abortControllerRef.current = null;
    }
  }, [operation, options]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      lastUpdated: null,
    });
  }, []);

  const retry = useCallback(() => {
    return execute();
  }, [execute]);

  return {
    ...state,
    execute,
    retry,
    reset,
    isRetryable: state.error?.isRetryable || false,
  };
}

// Specialized hook for form submissions
export function useFormSubmission<TData, TResult>(
  submitFunction: (data: TData) => Promise<TResult>,
  options: AsyncOperationOptions = {}
) {
  const [submissionState, setSubmissionState] = useState<AsyncOperationState<TResult>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const submit = useCallback(async (data: TData): Promise<TResult | null> => {
    setSubmissionState(prev => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const result = await submitFunction(data);
      
      setSubmissionState({
        data: result,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });

      if (options.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (error) {
      const errorState = ErrorHandler.parseApiError(error);
      
      setSubmissionState(prev => ({
        ...prev,
        loading: false,
        error: errorState,
      }));

      if (options.onError) {
        options.onError(errorState);
      }

      throw error;
    }
  }, [submitFunction, options]);

  const reset = useCallback(() => {
    setSubmissionState({
      data: null,
      loading: false,
      error: null,
      lastUpdated: null,
    });
  }, []);

  return {
    ...submissionState,
    submit,
    reset,
    isSubmitting: submissionState.loading,
  };
}

// Hook for data fetching with automatic retry and caching
export function useDataFetching<T>(
  fetchFunction: () => Promise<T>,
  dependencies: any[] = [],
  options: AsyncOperationOptions & { 
    immediate?: boolean;
    cacheTime?: number;
  } = {}
) {
  const { immediate = true, cacheTime = 5 * 60 * 1000 } = options; // 5 minutes default cache
  
  const asyncOp = useAsyncOperation(fetchFunction, options);
  const lastFetchRef = useRef<Date | null>(null);

  const shouldRefetch = useCallback(() => {
    if (!lastFetchRef.current) return true;
    if (!asyncOp.data) return true;
    
    const now = new Date();
    const timeSinceLastFetch = now.getTime() - lastFetchRef.current.getTime();
    return timeSinceLastFetch > cacheTime;
  }, [asyncOp.data, cacheTime]);

  const fetch = useCallback(async (force = false) => {
    if (!force && !shouldRefetch()) {
      return asyncOp.data;
    }

    lastFetchRef.current = new Date();
    return await asyncOp.execute();
  }, [asyncOp, shouldRefetch]);

  useEffect(() => {
    if (immediate) {
      fetch();
    }
  }, dependencies);

  return {
    ...asyncOp,
    fetch,
    refetch: () => fetch(true),
    isCached: !shouldRefetch(),
  };
}