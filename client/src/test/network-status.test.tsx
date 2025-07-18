import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNetworkStatus, useNetworkNotifications } from '../hooks/useNetworkStatus';
import { apiService } from '../services/api';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    healthCheck: vi.fn(),
  },
}));

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('useNetworkStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    navigator.onLine = true;
    (apiService.healthCheck as any).mockResolvedValue({ status: 'ok' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with online status', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isFullyConnected).toBe(true);
  });

  it('should check connection on mount', async () => {
    renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(apiService.healthCheck).toHaveBeenCalledTimes(1);
    });
  });

  it('should update connection status on successful health check', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.lastChecked).toBeInstanceOf(Date);
      expect(result.current.retryCount).toBe(0);
    });
  });

  it('should update connection status on failed health check', async () => {
    (apiService.healthCheck as any).mockRejectedValue(new Error('Network error'));
    
    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
      expect(result.current.retryCount).toBe(1);
    });
  });

  it('should handle online/offline events', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    // Simulate going offline
    act(() => {
      navigator.onLine = false;
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isFullyConnected).toBe(false);

    // Simulate going back online
    act(() => {
      navigator.onLine = true;
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
    
    await waitFor(() => {
      expect(apiService.healthCheck).toHaveBeenCalled();
    });
  });

  it('should perform periodic connection checks', async () => {
    renderHook(() => useNetworkStatus());

    // Initial check
    await waitFor(() => {
      expect(apiService.healthCheck).toHaveBeenCalledTimes(1);
    });

    // Fast-forward 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(apiService.healthCheck).toHaveBeenCalledTimes(2);
    });
  });

  it('should not perform periodic checks when offline', async () => {
    navigator.onLine = false;
    renderHook(() => useNetworkStatus());

    // Fast-forward 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    // Should not have called health check due to being offline
    expect(apiService.healthCheck).not.toHaveBeenCalled();
  });

  it('should manually check connection', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    // Wait for initial check
    await waitFor(() => {
      expect(apiService.healthCheck).toHaveBeenCalledTimes(1);
    });

    // Manual check
    await act(async () => {
      const isConnected = await result.current.checkConnection();
      expect(isConnected).toBe(true);
    });

    expect(apiService.healthCheck).toHaveBeenCalledTimes(2);
  });

  it('should increment retry count on failed checks', async () => {
    (apiService.healthCheck as any).mockRejectedValue(new Error('Network error'));
    
    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.retryCount).toBe(1);
    });

    // Manual check should increment retry count
    await act(async () => {
      await result.current.checkConnection();
    });

    expect(result.current.retryCount).toBe(2);
  });

  it('should reset retry count on successful check', async () => {
    // Start with failed check
    (apiService.healthCheck as any).mockRejectedValueOnce(new Error('Network error'));
    
    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.retryCount).toBe(1);
    });

    // Successful check should reset retry count
    (apiService.healthCheck as any).mockResolvedValue({ status: 'ok' });
    
    await act(async () => {
      await result.current.checkConnection();
    });

    expect(result.current.retryCount).toBe(0);
  });
});

describe('useNetworkNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    navigator.onLine = true;
    (apiService.healthCheck as any).mockResolvedValue({ status: 'ok' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not show notification when fully connected', async () => {
    const { result } = renderHook(() => useNetworkNotifications());

    await waitFor(() => {
      expect(result.current.showNotification).toBe(false);
    });
  });

  it('should show offline notification when offline', async () => {
    const { result } = renderHook(() => useNetworkNotifications());

    // Simulate going offline
    act(() => {
      navigator.onLine = false;
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(result.current.showNotification).toBe(true);
      expect(result.current.notificationMessage).toBe('You are offline. Some features may not work.');
    });
  });

  it('should show connection lost notification when server unreachable', async () => {
    (apiService.healthCheck as any).mockRejectedValue(new Error('Network error'));
    
    const { result } = renderHook(() => useNetworkNotifications());

    await waitFor(() => {
      expect(result.current.showNotification).toBe(true);
      expect(result.current.notificationMessage).toBe('Connection to server lost. Retrying...');
    });
  });

  it('should show connection restored notification', async () => {
    // Start with failed connection
    (apiService.healthCheck as any).mockRejectedValueOnce(new Error('Network error'));
    
    const { result } = renderHook(() => useNetworkNotifications());

    await waitFor(() => {
      expect(result.current.showNotification).toBe(true);
      expect(result.current.notificationMessage).toBe('Connection to server lost. Retrying...');
    });

    // Restore connection
    (apiService.healthCheck as any).mockResolvedValue({ status: 'ok' });
    
    await act(async () => {
      vi.advanceTimersByTime(30000); // Trigger periodic check
    });

    await waitFor(() => {
      expect(result.current.notificationMessage).toBe('Connection restored.');
    });

    // Should auto-hide after 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(result.current.showNotification).toBe(false);
    });
  });

  it('should allow manual dismissal of notifications', async () => {
    const { result } = renderHook(() => useNetworkNotifications());

    // Simulate going offline
    act(() => {
      navigator.onLine = false;
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(result.current.showNotification).toBe(true);
    });

    // Dismiss notification
    act(() => {
      result.current.dismissNotification();
    });

    expect(result.current.showNotification).toBe(false);
  });

  it('should provide network status in notifications hook', async () => {
    const { result } = renderHook(() => useNetworkNotifications());

    await waitFor(() => {
      expect(result.current.networkStatus.isOnline).toBe(true);
      expect(result.current.networkStatus.isConnected).toBe(true);
    });
  });
});