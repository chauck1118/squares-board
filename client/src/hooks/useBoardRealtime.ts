import { useEffect, useCallback, useState } from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { Square, Game } from '../types/board';
import { DataStore } from 'aws-amplify/datastore';

interface UseBoardRealtimeProps {
  boardId: string;
  onScoreUpdate?: (game: Game) => void;
  onSquareClaimed?: (square: Square) => void;
  onPaymentConfirmed?: (square: Square) => void;
  onBoardAssigned?: () => void;
  onWinnerAnnounced?: (winner: any) => void;
}

interface RealtimeNotification {
  id: string;
  type: 'score_update' | 'square_claimed' | 'payment_confirmed' | 'winner_announced' | 'board_assigned' | 'board_status_change';
  message: string;
  timestamp: string;
  data?: any;
}

export const useBoardRealtime = ({
  boardId,
  onScoreUpdate,
  onSquareClaimed,
  onPaymentConfirmed,
  onBoardAssigned,
  onWinnerAnnounced
}: UseBoardRealtimeProps) => {
  const { connected, joinBoard, leaveBoard, on, off } = useSubscription();
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  // Join board subscriptions when connected
  useEffect(() => {
    if (connected && boardId) {
      joinBoard(boardId);
      console.log(`Joined board subscriptions: ${boardId}`);
      setIsOffline(false);
    } else if (!connected && boardId) {
      setIsOffline(true);
    }

    return () => {
      if (boardId) {
        leaveBoard(boardId);
        console.log(`Left board subscriptions: ${boardId}`);
      }
    };
  }, [connected, boardId, joinBoard, leaveBoard]);

  // Add notification helper
  const addNotification = useCallback((notification: Omit<RealtimeNotification, 'id'>) => {
    const newNotification: RealtimeNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 9)]); // Keep last 10
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 5000);
  }, []);

  // Score update handler
  const handleScoreUpdate = useCallback((data: any) => {
    console.log('Score update received:', data);
    
    if (data.boardId === boardId) {
      onScoreUpdate?.(data.game);
      
      addNotification({
        type: 'score_update',
        message: `Game #${data.game.gameNumber}: ${data.game.team1} ${data.game.team1Score || 0} - ${data.game.team2Score || 0} ${data.game.team2}`,
        timestamp: data.timestamp,
        data: data.game
      });
    }
  }, [boardId, onScoreUpdate, addNotification]);

  // Square claimed handler
  const handleSquareClaimed = useCallback((data: any) => {
    console.log('Square claimed:', data);
    
    if (data.boardId === boardId) {
      onSquareClaimed?.(data.square);
      
      addNotification({
        type: 'square_claimed',
        message: `${data.square.user?.displayName || 'Someone'} claimed a square`,
        timestamp: data.timestamp,
        data: data.square
      });
    }
  }, [boardId, onSquareClaimed, addNotification]);

  // Payment confirmed handler
  const handlePaymentConfirmed = useCallback((data: any) => {
    console.log('Payment confirmed:', data);
    
    if (data.boardId === boardId) {
      onPaymentConfirmed?.(data.square);
      
      addNotification({
        type: 'payment_confirmed',
        message: `${data.square.user?.displayName || 'Someone'}'s payment was confirmed`,
        timestamp: data.timestamp,
        data: data.square
      });
    }
  }, [boardId, onPaymentConfirmed, addNotification]);

  // Board assigned handler
  const handleBoardAssigned = useCallback((data: any) => {
    console.log('Board assigned:', data);
    
    if (data.boardId === boardId) {
      onBoardAssigned?.();
      
      addNotification({
        type: 'board_assigned',
        message: 'Board squares have been randomly assigned!',
        timestamp: data.timestamp,
        data: data.assignment
      });
    }
  }, [boardId, onBoardAssigned, addNotification]);

  // Board status change handler
  const handleBoardStatusChange = useCallback((data: any) => {
    console.log('Board status changed:', data);
    
    if (data.boardId === boardId) {
      addNotification({
        type: 'board_status_change',
        message: `Board status changed to ${data.status}`,
        timestamp: data.timestamp,
        data: data.data
      });
    }
  }, [boardId, addNotification]);

  // Winner announced handler
  const handleWinnerAnnounced = useCallback((data: any) => {
    console.log('Winner announced:', data);
    
    if (data.boardId === boardId) {
      onWinnerAnnounced?.(data.winner);
      
      const winnerName = data.winner.square?.user?.displayName || 'Someone';
      const payout = data.winner.payout ? `${data.winner.payout}` : '';
      
      addNotification({
        type: 'winner_announced',
        message: `🎉 ${winnerName} won ${payout}!`,
        timestamp: data.timestamp,
        data: data.winner
      });
    }
  }, [boardId, onWinnerAnnounced, addNotification]);

  // Set up event listeners
  useEffect(() => {
    if (!connected) return;

    on('score_update', handleScoreUpdate);
    on('square_claimed', handleSquareClaimed);
    on('payment_confirmed', handlePaymentConfirmed);
    on('board_assigned', handleBoardAssigned);
    on('board_status_change', handleBoardStatusChange);
    on('winner_announced', handleWinnerAnnounced);

    return () => {
      off('score_update', handleScoreUpdate);
      off('square_claimed', handleSquareClaimed);
      off('payment_confirmed', handlePaymentConfirmed);
      off('board_assigned', handleBoardAssigned);
      off('board_status_change', handleBoardStatusChange);
      off('winner_announced', handleWinnerAnnounced);
    };
  }, [
    connected,
    handleScoreUpdate,
    handleSquareClaimed,
    handlePaymentConfirmed,
    handleBoardAssigned,
    handleBoardStatusChange,
    handleWinnerAnnounced,
    on,
    off
  ]);

  // Set up DataStore sync listeners for offline support
  useEffect(() => {
    if (!boardId) return;
    
    // Listen for network status changes
    const handleNetworkChange = () => {
      setIsOffline(!navigator.onLine);
      
      if (navigator.onLine) {
        // When coming back online, trigger a DataStore sync
        DataStore.start().catch(error => {
          console.error('Failed to restart DataStore:', error);
        });
      }
    };
    
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    
    // Initial check
    setIsOffline(!navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, [boardId]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Remove specific notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    connected,
    isOffline,
    notifications,
    clearNotifications,
    removeNotification
  };
};