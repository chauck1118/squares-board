import { Server as SocketIOServer, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'

interface AuthenticatedSocket extends Socket {
  userId?: string
  isAdmin?: boolean
}

interface SocketAuthPayload {
  userId: string
  isAdmin: boolean
}

/**
 * Setup Socket.io event handlers
 */
export function setupSocketHandlers(io: SocketIOServer): void {
  // Authentication middleware for Socket.io
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
      
      if (!token) {
        return next(new Error('Authentication token required'))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as SocketAuthPayload
      
      // Verify user still exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, isAdmin: true }
      })

      if (!user) {
        return next(new Error('User not found'))
      }

      socket.userId = decoded.userId
      socket.isAdmin = decoded.isAdmin
      next()
    } catch (error) {
      next(new Error('Invalid authentication token'))
    }
  })

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} connected via Socket.io`)

    // Join user to their personal room for targeted notifications
    if (socket.userId) {
      socket.join(`user:${socket.userId}`)
    }

    // Join admin users to admin room
    if (socket.isAdmin) {
      socket.join('admin')
    }

    // Handle joining board-specific rooms
    socket.on('join_board', (boardId: string) => {
      if (typeof boardId === 'string' && boardId.length > 0) {
        socket.join(`board:${boardId}`)
        console.log(`User ${socket.userId} joined board room: ${boardId}`)
      }
    })

    // Handle leaving board-specific rooms
    socket.on('leave_board', (boardId: string) => {
      if (typeof boardId === 'string' && boardId.length > 0) {
        socket.leave(`board:${boardId}`)
        console.log(`User ${socket.userId} left board room: ${boardId}`)
      }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected from Socket.io`)
    })

    // Handle ping for connection testing
    socket.on('ping', (callback) => {
      if (typeof callback === 'function') {
        callback('pong')
      }
    })
  })
}

/**
 * Broadcast score update to all users in a board room
 */
export function broadcastScoreUpdate(io: SocketIOServer, boardId: string, gameData: any): void {
  io.to(`board:${boardId}`).emit('score_update', {
    type: 'score_update',
    boardId,
    game: gameData,
    timestamp: new Date().toISOString()
  })
  console.log(`Broadcasted score update for board ${boardId}`)
}

/**
 * Broadcast square claim notification to board users
 */
export function broadcastSquareClaimed(io: SocketIOServer, boardId: string, squareData: any): void {
  io.to(`board:${boardId}`).emit('square_claimed', {
    type: 'square_claimed',
    boardId,
    square: squareData,
    timestamp: new Date().toISOString()
  })
  console.log(`Broadcasted square claimed for board ${boardId}`)
}

/**
 * Broadcast payment confirmation to board users and specific user
 */
export function broadcastPaymentConfirmed(io: SocketIOServer, boardId: string, userId: string, squareData: any): void {
  // Notify all board users
  io.to(`board:${boardId}`).emit('payment_confirmed', {
    type: 'payment_confirmed',
    boardId,
    square: squareData,
    timestamp: new Date().toISOString()
  })

  // Send specific notification to the user whose payment was confirmed
  io.to(`user:${userId}`).emit('payment_notification', {
    type: 'payment_confirmed',
    boardId,
    square: squareData,
    message: 'Your square payment has been confirmed',
    timestamp: new Date().toISOString()
  })

  console.log(`Broadcasted payment confirmation for board ${boardId}, user ${userId}`)
}

/**
 * Broadcast board assignment completion to all board users
 */
export function broadcastBoardAssigned(io: SocketIOServer, boardId: string, assignmentData: any): void {
  io.to(`board:${boardId}`).emit('board_assigned', {
    type: 'board_assigned',
    boardId,
    assignment: assignmentData,
    timestamp: new Date().toISOString()
  })
  console.log(`Broadcasted board assignment for board ${boardId}`)
}

/**
 * Broadcast winner announcement to board users
 */
export function broadcastWinnerAnnounced(io: SocketIOServer, boardId: string, winnerData: any): void {
  io.to(`board:${boardId}`).emit('winner_announced', {
    type: 'winner_announced',
    boardId,
    winner: winnerData,
    timestamp: new Date().toISOString()
  })

  // Send specific notification to the winner
  if (winnerData.user?.id) {
    io.to(`user:${winnerData.user.id}`).emit('winner_notification', {
      type: 'winner_announced',
      boardId,
      winner: winnerData,
      message: `Congratulations! You won $${winnerData.payout}!`,
      timestamp: new Date().toISOString()
    })
  }

  console.log(`Broadcasted winner announcement for board ${boardId}`)
}

/**
 * Broadcast board status change to all board users
 */
export function broadcastBoardStatusChange(io: SocketIOServer, boardId: string, status: string, additionalData?: any): void {
  io.to(`board:${boardId}`).emit('board_status_change', {
    type: 'board_status_change',
    boardId,
    status,
    data: additionalData,
    timestamp: new Date().toISOString()
  })
  console.log(`Broadcasted board status change for board ${boardId}: ${status}`)
}