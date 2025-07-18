import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

interface NetworkStatus {
  isOnline: boolean;
  isConnected: boolean;
  lastChecked: Date | null;
  retryCount: number;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isConnected: true,
    lastChecked: null,
    retryCount: 0,
  });

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      await apiService.healthCheck();
      setStatus(prev => ({
        ...prev,
        isConnected: true,
        lastChecked: new Date(),
        retryCount: 0,
      }));
      return true;
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        lastChecked: new Date(),
        retryCount: prev.retryCount + 1,
      }));
      return false;
    }
  }, []);

  const handleOnline = useCallback(() => {
    setStatus(prev => ({ ...prev, isOnline: true }));
    checkConnection();
  }, [checkConnection]);

  const handleOffline = useCallback(() => {
    setStatus(prev => ({ 
      ...prev, 
      isOnline: false, 
      isConnected: false 
    }));
  }, []);

  useEffect(() => {
    // Initial connection check
    checkConnection();

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connection check when online
    const interval = setInterval(() => {
      if (navigator.onLine) {
        checkConnection();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [handleOnline, handleOffline, checkConnection]);

  return {
    ...status,
    checkConnection,
    isFullyConnected: status.isOnline && status.isConnected,
  };
}

// Hook for showing network status notifications
export function useNetworkNotifications() {
  const networkStatus = useNetworkStatus();
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  useEffect(() => {
    if (!networkStatus.isOnline) {
      setNotificationMessage('You are offline. Some features may not work.');
      setShowNotification(true);
    } else if (!networkStatus.isConnected) {
      setNotificationMessage('Connection to server lost. Retrying...');
      setShowNotification(true);
    } else if (showNotification) {
      setNotificationMessage('Connection restored.');
      setShowNotification(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 3000);
    }
  }, [networkStatus.isOnline, networkStatus.isConnected, showNotification]);

  const dismissNotification = useCallback(() => {
    setShowNotification(false);
  }, []);

  return {
    showNotification,
    notificationMessage,
    dismissNotification,
    networkStatus,
  };
}