import request from 'supertest'
import express from 'express'
import { prisma } from '../../server/lib/prisma'
import boardRoutes from '../../server/routes/boards'
import adminRoutes from '../../server/routes/admin'
import { authenticateToken, requireAdmin } from '../../server/middleware/auth'

// Mock Prisma
jest.mock('../../server/lib/prisma', () => ({
  prisma: {
    board: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payoutStructure: {
      create: jest.fn(),
    },
    square: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

// Mock auth middleware
jest.mock('../../server/middleware/auth', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: { code: 'MISSING_TOKEN', message: 'Access token is required' } })
    }
    
    const token = authHeader.split(' ')[1]
    if (token === 'valid-user-token') {
      req.user = { userId: 'user-1', isAdmin: false }
    } else if (token === 'valid-admin-token') {
      req.user = { userId: 'admin-1', isAdmin: true }
    } else {
      return res.status(403).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token' } })
    }
    next()
  }),
  requireAdmin: jest.fn((req, res, next) => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: { code: 'ADMIN_REQUIRED', message: 'Admin privileges required' } })
    }
    next()
  }),
}))

const app = express()
app.use(express.json())
app.use('/api/boards', boardRoutes)
app.use('/api/admin', adminRoutes)

const mockBoard = {
  id: 'board-1',
  name: 'Test Board',
  pricePerSquare: 10.0,
  status: 'OPEN' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('Payment Tracking Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Board Filling Detection Workflow', () => {
    it('should track payment status and update board status when filled', async () => {
      // Step 1: User claims squares (creates PENDING squares)
      const boardWithSquares = {
        ...mockBoard,
        squares: [], // No existing squares for this user
        _count: { squares: 95 }, // 95 paid squares already exist
      }
      
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue(boardWithSquares)
      ;(prisma.square.count as jest.Mock).mockResolvedValue(95) // 95 total squares
      ;(prisma.square.createMany as jest.Mock).mockResolvedValue({ count: 5 })
      ;(prisma.square.findMany as jest.Mock).mockResolvedValue([
        { id: 'square-1', boardId: 'board-1', userId: 'user-1', paymentStatus: 'PENDING' },
        { id: 'square-2', boardId: 'board-1', userId: 'user-1', paymentStatus: 'PENDING' },
        { id: 'square-3', boardId: 'board-1', userId: 'user-1', paymentStatus: 'PENDING' },
        { id: 'square-4', boardId: 'board-1', userId: 'user-1', paymentStatus: 'PENDING' },
        { id: 'square-5', boardId: 'board-1', userId: 'user-1', paymentStatus: 'PENDING' },
      ])

      const claimResponse = await request(app)
        .post('/api/boards/board-1/claim')
        .set('Authorization', 'Bearer valid-user-token')
        .send({ numberOfSquares: 5 })

      expect(claimResponse.status).toBe(201)
      expect(claimResponse.body.message).toBe('Successfully claimed 5 squares')

      // Step 2: Admin marks squares as paid, triggering board status check
      const squareWithBoard = {
        id: 'square-1',
        boardId: 'board-1',
        userId: 'user-1',
        paymentStatus: 'PENDING' as const,
        board: mockBoard,
        user: { id: 'user-1', displayName: 'Test User' },
      }

      const updatedSquare = {
        ...squareWithBoard,
        paymentStatus: 'PAID' as const,
      }

      ;(prisma.square.findUnique as jest.Mock).mockResolvedValue(squareWithBoard)
      ;(prisma.square.update as jest.Mock).mockResolvedValue(updatedSquare)
      
      // Mock board status check - this square payment makes it 100 paid squares
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue({
        ...mockBoard,
        _count: { squares: 100 }, // Now 100 paid squares
      })
      
      ;(prisma.board.update as jest.Mock).mockResolvedValue({
        ...mockBoard,
        status: 'FILLED',
      })

      const paymentResponse = await request(app)
        .put('/api/admin/squares/square-1/payment')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ paymentStatus: 'PAID' })

      expect(paymentResponse.status).toBe(200)
      expect(paymentResponse.body.square.paymentStatus).toBe('PAID')
      
      // Verify board status was updated to FILLED
      expect(prisma.board.update).toHaveBeenCalledWith({
        where: { id: 'board-1' },
        data: { status: 'FILLED' },
      })
    })

    it('should not update board status if less than 100 paid squares', async () => {
      const squareWithBoard = {
        id: 'square-1',
        boardId: 'board-1',
        userId: 'user-1',
        paymentStatus: 'PENDING' as const,
        board: mockBoard,
        user: { id: 'user-1', displayName: 'Test User' },
      }

      const updatedSquare = {
        ...squareWithBoard,
        paymentStatus: 'PAID' as const,
      }

      ;(prisma.square.findUnique as jest.Mock).mockResolvedValue(squareWithBoard)
      ;(prisma.square.update as jest.Mock).mockResolvedValue(updatedSquare)
      
      // Mock board status check - only 99 paid squares
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue({
        ...mockBoard,
        _count: { squares: 99 },
      })

      const paymentResponse = await request(app)
        .put('/api/admin/squares/square-1/payment')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ paymentStatus: 'PAID' })

      expect(paymentResponse.status).toBe(200)
      expect(paymentResponse.body.square.paymentStatus).toBe('PAID')
      
      // Verify board status was NOT updated (should remain OPEN)
      expect(prisma.board.update).not.toHaveBeenCalled()
    })

    it('should provide comprehensive payment status overview', async () => {
      const boardWithPaymentData = {
        ...mockBoard,
        squares: [
          {
            id: 'square-1',
            paymentStatus: 'PAID' as const,
            gridPosition: null,
            createdAt: new Date(),
            user: { id: 'user-1', displayName: 'User 1', email: 'user1@example.com' },
          },
          {
            id: 'square-2',
            paymentStatus: 'PAID' as const,
            gridPosition: null,
            createdAt: new Date(),
            user: { id: 'user-1', displayName: 'User 1', email: 'user1@example.com' },
          },
          {
            id: 'square-3',
            paymentStatus: 'PENDING' as const,
            gridPosition: null,
            createdAt: new Date(),
            user: { id: 'user-2', displayName: 'User 2', email: 'user2@example.com' },
          },
          {
            id: 'square-4',
            paymentStatus: 'PAID' as const,
            gridPosition: null,
            createdAt: new Date(),
            user: { id: 'user-2', displayName: 'User 2', email: 'user2@example.com' },
          },
        ],
      }

      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue(boardWithPaymentData)

      const statusResponse = await request(app)
        .get('/api/admin/boards/board-1/payment-status')
        .set('Authorization', 'Bearer valid-admin-token')

      expect(statusResponse.status).toBe(200)
      expect(statusResponse.body.paymentStats).toEqual({
        totalSquares: 4,
        paidSquares: 3,
        pendingSquares: 1,
      })
      
      expect(statusResponse.body.squaresByUser).toHaveLength(2)
      
      // Check User 1 stats
      const user1Stats = statusResponse.body.squaresByUser.find((u: any) => u.user.id === 'user-1')
      expect(user1Stats.paidCount).toBe(2)
      expect(user1Stats.pendingCount).toBe(0)
      
      // Check User 2 stats
      const user2Stats = statusResponse.body.squaresByUser.find((u: any) => u.user.id === 'user-2')
      expect(user2Stats.paidCount).toBe(1)
      expect(user2Stats.pendingCount).toBe(1)
    })
  })

  describe('Payment Status Validation', () => {
    it('should track pending vs paid squares correctly in board listing', async () => {
      const mockBoardsData = [
        {
          ...mockBoard,
          squares: [
            { id: 'square-1', paymentStatus: 'PAID', userId: 'user-1' },
            { id: 'square-2', paymentStatus: 'PENDING', userId: 'user-2' },
            { id: 'square-3', paymentStatus: 'PAID', userId: 'user-3' },
            { id: 'square-4', paymentStatus: 'PENDING', userId: 'user-4' },
            { id: 'square-5', paymentStatus: 'PAID', userId: 'user-5' },
          ],
          _count: { squares: 5 },
        },
      ]

      ;(prisma.board.findMany as jest.Mock).mockResolvedValue(mockBoardsData)

      const response = await request(app).get('/api/boards')

      expect(response.status).toBe(200)
      expect(response.body.boards[0]).toMatchObject({
        id: 'board-1',
        totalSquares: 5,
        claimedSquares: 5, // All squares have users
        paidSquares: 3, // Only 3 are paid
      })
    })
  })
})