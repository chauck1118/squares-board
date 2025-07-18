import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { socketService, SocketEvents } from '../services/socket';
import { useAuth } from './AuthContext';

interface SocketContextType {
  connected: boolean;
  joinBoard: (boardId: string) => void;
  leaveBoard: (boardId: string) => void;
  on: <K extends keyof SocketEvents>(event: K, callback: (data: SocketEvents[K]) => void) => void;
  off: <K extends keyof SocketEvents>(event: K, callback?: (data: SocketEvents[K]) => void) => void;
  ping: () => Promise<string>;
}

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user, token } = useAuth();
  const [connected, setConnected] = useState(false);

  // Connect to socket when user is authenticated
  useEffect(() => {
    if (user && token) {
      const connectSocket = async () => {
        try {
          await socketService.connect(token);
          setConnected(true);
        } catch (error) {
          console.error('Failed to connect to socket:', error);
          setConnected(false);
        }
      };

      connectSocket();
    } else {
      // Disconnect when user logs out
      socketService.disconnect();
      setConnected(false);
    }

    return () => {
      socketService.disconnect();
      setConnected(false);
    };
  }, [user, token]);

  // Monitor connection status
  useEffect(() => {
    const checkConnection = () => {
      setConnected(socketService.connected);
    };

    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  const joinBoard = useCallback((boardId: string) => {
    socketService.joinBoard(boardId);
  }, []);

  const leaveBoard = useCallback((boardId: string) => {
    socketService.leaveBoard(boardId);
  }, []);

  const on = useCallback(<K extends keyof SocketEvents>(
    event: K, 
    callback: (data: SocketEvents[K]) => void
  ) => {
    socketService.on(event, callback);
  }, []);

  const off = useCallback(<K extends keyof SocketEvents>(
    event: K, 
    callback?: (data: SocketEvents[K]) => void
  ) => {
    socketService.off(event, callback);
  }, []);

  const ping = useCallback(async (): Promise<string> => {
    return socketService.ping();
  }, []);

  const value: SocketContextType = {
    connected,
    joinBoard,
    leaveBoard,
    on,
    off,
    ping
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};