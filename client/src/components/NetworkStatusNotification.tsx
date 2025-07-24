import React from 'react';
import { useNetworkNotifications } from '../hooks/useNetworkStatus';

interface NetworkStatusNotificationProps {
  onOffline?: () => void;
  onOnline?: () => void;
  showDataStoreStatus?: boolean;
}

const NetworkStatusNotification: React.FC<NetworkStatusNotificationProps> = ({
  onOffline,
  onOnline,
  showDataStoreStatus = true,
}) => {
  const { showNotification, notificationMessage, dismissNotification, networkStatus } = useNetworkNotifications();

  React.useEffect(() => {
    if (!networkStatus.isOnline && onOffline) {
      onOffline();
    } else if (networkStatus.isOnline && networkStatus.isConnected && onOnline) {
      onOnline();
    }
  }, [networkStatus.isOnline, networkStatus.isConnected, onOffline, onOnline]);

  if (!showNotification) {
    return null;
  }

  const getNotificationStyle = () => {
    if (!networkStatus.isOnline) {
      return 'bg-red-500 text-white';
    } else if (!networkStatus.isConnected) {
      return 'bg-yellow-500 text-white';
    } else {
      return 'bg-green-500 text-white';
    }
  };

  const getDataStoreMessage = () => {
    if (!networkStatus.isOnline) {
      return ' Changes will be saved locally and synced when you reconnect.';
    } else if (!networkStatus.isConnected) {
      return ' Attempting to sync your changes...';
    } else {
      return ' All changes are synced.';
    }
  };

  const getIcon = () => {
    if (!networkStatus.isOnline) {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    } else if (!networkStatus.isConnected) {
      return (
        <svg className="w-5 h-5 animate-spin" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className={`${getNotificationStyle()} px-4 py-3 shadow-lg`}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            {getIcon()}
            <span className="text-sm font-medium">
              {notificationMessage}
              {showDataStoreStatus && getDataStoreMessage()}
            </span>
            {networkStatus.retryCount > 0 && !networkStatus.isConnected && (
              <span className="text-xs opacity-75">
                (Attempt {networkStatus.retryCount})
              </span>
            )}
          </div>
          
          <button
            onClick={dismissNotification}
            className="text-white hover:text-gray-200 focus:outline-none focus:text-gray-200"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NetworkStatusNotification;