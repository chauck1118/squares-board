import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface SocketEvents {
  // Score updates
  score_update: {
    type: 'score_update';
    boardId: string;
    game: {
      id: string;
      gameNumber: number;
      team1: string;
      team2: string;
      team1Score: number | null;
      team2Score: number | null;
      status: string;
      round: string;
      winnerSquare?: any;
      payout?: number;
    };
    timestamp: string;
  };

  // Square claiming
  square_claimed: {
    type: 'square_claimed';
    boardId: string;
    square: {
      id: string;
      userId: string;
      paymentStatus: 'PENDING' | 'PAID';
      user?: {
        id: string;
        displayName: string;
      };
    };
    timestamp: string;
  };

  // Payment confirmations
  payment_confirmed: {
    type: 'payment_confirmed';
    boardId: string;
    square: {
      id: string;
      userId: string;
      paymentStatus: 'PAID';
      user?: {
        id: string;
        displayName: string;
      };
    };
    timestamp: string;
  };

  payment_notification: {
    type: 'payment_confirmed';
    boardId: string;
    square: {
      id: string;
      userId: string;
      paymentStatus: 'PAID';
    };
    message: string;
    timestamp: string;
  };

  // Board status changes
  board_assigned: {
    type: 'board_assigned';
    boardId: string;
    assignment: {
      squares: Array<{
        id: string;
        gridPosition: number;
        winningTeamNumber: number;
        losingTeamNumber: number;
      }>;
    };
    timestamp: string;
  };

  board_status_change: {
    type: 'board_status_change';
    boardId: string;
    status: string;
    data?: any;
    timestamp: string;
  };

  // Winner announcements
  winner_announced: {
    type: 'winner_announced';
    boardId: string;
    winner: {
      game: {
        id: string;
        gameNumber: number;
        team1Score: number;
        team2Score: number;
      };
      square: {
        id: string;
        gridPosition: number;
        user?: {
          id: string;
          displayName: string;
        };
      };
      payout: number;
    };
    timestamp: string;
  };

  winner_notification: {
    type: 'winner_announced';
    boardId: string;
    winner: any;
    message: string;
    timestamp: string;
  };
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(SOCKET_URL, {
        auth: {
          token
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true
      });

      this.socket.on('connect', () => {
        console.log('Socket.io connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('connect_error', (error: any) => {
        console.error('Socket.io connection error:', error);
        this.isConnected = false;
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => {
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.socket?.connect();
          }, this.reconnectDelay * this.reconnectAttempts);
        } else {
          reject(error);
        }
      });

      this.socket.on('disconnect', (reason: string) => {
        console.log('Socket.io disconnected:', reason);
        this.isConnected = false;
        
        // Auto-reconnect for certain disconnect reasons
        if (reason === 'io server disconnect' || reason === 'transport close') {
          this.reconnectAttempts = 0;
          setTimeout(() => {
            this.socket?.connect();
          }, this.reconnectDelay);
        }
      });

      // Handle authentication errors
      this.socket.on('error', (error: any) => {
        console.error('Socket.io error:', error);
        if (error.message?.includes('Authentication')) {
          this.disconnect();
          reject(new Error('Socket authentication failed'));
        }
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
    }
  }

  // Board room management
  joinBoard(boardId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join_board', boardId);
    }
  }

  leaveBoard(boardId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave_board', boardId);
    }
  }

  // Event listeners
  on<K extends keyof SocketEvents>(event: K, callback: (data: SocketEvents[K]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off<K extends keyof SocketEvents>(event: K, callback?: (data: SocketEvents[K]) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  // Connection status
  get connected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Ping test
  ping(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 5000);

      this.socket.emit('ping', (response: string) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });
  }
}

export const socketService = new SocketService();