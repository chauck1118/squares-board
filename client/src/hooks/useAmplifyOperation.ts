import { useState, useCallback, useRef, useEffect } from 'react';
import { AmplifyErrorHandler, AmplifyErrorState, withAmplifyRetry } from '../utils/amplifyErrorHandling';

/**
 * State for AWS Amplify operations
 */
interface AmplifyOperationState<T> {
  data: T | null;
  loading: boolean;
  error: AmplifyErrorState | null;
  lastUpdated: Date | null;
  isOffline: boolean;
}

/**
 * Options for AWS Amplify operations
 */
interface AmplifyOperationOptions {
  retryAttempts?: number;
  enableOfflineSupport?: boolean;
  cacheTime?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: AmplifyErrorState) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

/**
 * Hook for AWS Amplify operations with comprehensive error handling
 */
export function useAmplifyOperation<T>(
  operation: () => Promise<T>,
  context: string,
  options: AmplifyOperationOptions = {}
) {
  const {
    retryAttempts = 3,
    enableOfflineSupport = true,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    onSuccess,
    onError,
    onOffline,
    onOnline,
  } = options;

  const [state, setState] = useState<AmplifyOperationState<T>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
    isOffline: !navigator.onLine,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const cacheRef = useRef<{ data: T; timestamp: Date } | null>(null);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOffline: false }));
      if (onOnline) onOnline();
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOffline: true }));
      if (onOffline) onOffline();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onOnline, onOffline]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Check if cached data is still valid
   */
  const isCacheValid = useCallback((): boolean => {
    if (!cacheRef.current) return false;
    
    const now = new Date();
    const timeSinceCache = now.getTime() - cacheRef.current.timestamp.getTime();
    return timeSinceCache < cacheTime;
  }, [cacheTime]);

  /**
   * Execute the operation with error handling and retry logic
   */
  const execute = useCallback(async (forceRefresh = false): Promise<T | null> => {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && isCacheValid() && cacheRef.current) {
      setState(prev => ({
        ...prev,
        data: cacheRef.current!.data,
        loading: false,
        error: null,
        lastUpdated: cacheRef.current!.timestamp,
      }));
      return cacheRef.current.data;
    }

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
      // Check if offline and offline support is disabled
      if (!navigator.onLine && !enableOfflineSupport) {
        throw new Error('Operation requires internet connection');
      }

      const result = await withAmplifyRetry(operation, context, retryAttempts);

      if (!mountedRef.current) return null;

      // Cache the result
      cacheRef.current = {
        data: result,
        timestamp: new Date(),
      };

      setState({
        data: result,
        loading: false,
        error: null,
        lastUpdated: new Date(),
        isOffline: !navigator.onLine,
      });

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (error) {
      if (!mountedRef.current) return null;

      const amplifyError = error instanceof Error 
        ? AmplifyErrorHandler.parseError(error, context)
        : error as AmplifyErrorState;

      setState(prev => ({
        ...prev,
        loading: false,
        error: amplifyError,
      }));

      if (onError) {
        onError(amplifyError);
      }

      throw amplifyError;
    } finally {
      abortControllerRef.current = null;
    }
  }, [operation, context, retryAttempts, enableOfflineSupport, isCacheValid, onSuccess, onError]);

  /**
   * Reset the operation state
   */
  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      lastUpdated: null,
      isOffline: !navigator.onLine,
    });
    cacheRef.current = null;
  }, []);

  /**
   * Retry the operation
   */
  const retry = useCallback(() => {
    return execute(true);
  }, [execute]);

  /**
   * Clear cache and force refresh
   */
  const refresh = useCallback(() => {
    cacheRef.current = null;
    return execute(true);
  }, [execute]);

  return {
    ...state,
    execute,
    retry,
    reset,
    refresh,
    isRetryable: state.error?.isRetryable || false,
    isCached: isCacheValid(),
    canRetry: state.error ? AmplifyErrorHandler.shouldAutoRetry(state.error, 1) : false,
  };
}

/**
 * Hook for AWS Amplify mutations (create, update, delete operations)
 */
export function useAmplifyMutation<TInput, TOutput>(
  mutation: (input: TInput) => Promise<TOutput>,
  context: string,
  options: AmplifyOperationOptions = {}
) {
  const [state, setState] = useState<AmplifyOperationState<TOutput>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
    isOffline: !navigator.onLine,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Execute the mutation
   */
  const mutate = useCallback(async (input: TInput): Promise<TOutput | null> => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const result = await withAmplifyRetry(
        () => mutation(input),
        context,
        options.retryAttempts || 3
      );

      if (!mountedRef.current) return null;

      setState({
        data: result,
        loading: false,
        error: null,
        lastUpdated: new Date(),
        isOffline: !navigator.onLine,
      });

      if (options.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (error) {
      if (!mountedRef.current) return null;

      const amplifyError = error instanceof Error 
        ? AmplifyErrorHandler.parseError(error, context)
        : error as AmplifyErrorState;

      setState(prev => ({
        ...prev,
        loading: false,
        error: amplifyError,
      }));

      if (options.onError) {
        options.onError(amplifyError);
      }

      throw amplifyError;
    }
  }, [mutation, context, options]);

  /**
   * Reset the mutation state
   */
  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      lastUpdated: null,
      isOffline: !navigator.onLine,
    });
  }, []);

  return {
    ...state,
    mutate,
    reset,
    isSubmitting: state.loading,
    isRetryable: state.error?.isRetryable || false,
  };
}

/**
 * Hook for AWS Amplify subscriptions with error handling
 */
export function useAmplifySubscription<T>(
  subscription: () => { subscribe: (observer: any) => { unsubscribe: () => void } },
  context: string,
  options: AmplifyOperationOptions = {}
) {
  const [state, setState] = useState<AmplifyOperationState<T>>({
    data: null,
    loading: true,
    error: null,
    lastUpdated: null,
    isOffline: !navigator.onLine,
  });

  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  /**
   * Start the subscription
   */
  const subscribe = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const sub = subscription();
      
      subscriptionRef.current = sub.subscribe({
        next: (data: T) => {
          if (!mountedRef.current) return;
          
          setState({
            data,
            loading: false,
            error: null,
            lastUpdated: new Date(),
            isOffline: !navigator.onLine,
          });

          if (options.onSuccess) {
            options.onSuccess(data);
          }
        },
        error: (error: any) => {
          if (!mountedRef.current) return;

          const amplifyError = AmplifyErrorHandler.parseError(error, context);
          
          setState(prev => ({
            ...prev,
            loading: false,
            error: amplifyError,
          }));

          if (options.onError) {
            options.onError(amplifyError);
          }
        },
      });
    } catch (error) {
      const amplifyError = AmplifyErrorHandler.parseError(error, context);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: amplifyError,
      }));

      if (options.onError) {
        options.onError(amplifyError);
      }
    }
  }, [subscription, context, options]);

  /**
   * Unsubscribe from the subscription
   */
  const unsubscribe = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
  }, []);

  /**
   * Reset the subscription state
   */
  const reset = useCallback(() => {
    unsubscribe();
    setState({
      data: null,
      loading: true,
      error: null,
      lastUpdated: null,
      isOffline: !navigator.onLine,
    });
  }, [unsubscribe]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    reset,
    isConnected: !state.loading && !state.error,
    isRetryable: state.error?.isRetryable || false,
  };
}