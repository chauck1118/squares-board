import request from 'supertest'
import express from 'express'
import { prisma } from '../../server/lib/prisma'
import boardRoutes from '../../server/routes/boards'
import { authenticateToken, requireAdmin } from '../../server/middleware/auth'
import { generateToken } from '../../server/utils/auth'
import { getBoardScoringTable } from '../../server/utils/scoring'

// Create test app
const app = express()
app.use(express.json())
app.use('/api/boards', boardRoutes)

// Mock data
const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
  passwordHash: 'hashed-password',
  isAdmin: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockAdmin = {
  id: 'admin-1',
  email: 'admin@example.com',
  displayName: 'Test Admin',
  passwordHash: 'hashed-password',
  isAdmin: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockBoard = {
  id: 'board-1',
  name: 'Test Board',
  pricePerSquare: 10.0,
  status: 'OPEN' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockPayoutStructure = {
  id: 'payout-1',
  boardId: 'board-1',
  round1: 25.0,
  round2: 50.0,
  sweet16: 100.0,
  elite8: 200.0,
  final4: 400.0,
  championship: 800.0,
}

// Mock Prisma
jest.mock('../../server/lib/prisma', () => ({
  prisma: {
    board: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    payoutStructure: {
      create: jest.fn(),
    },
    square: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

// Mock scoring utilities
jest.mock('../../server/utils/scoring', () => ({
  getBoardScoringTable: jest.fn(),
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

describe('Board Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/boards', () => {
    it('should return list of boards with statistics', async () => {
      const mockBoardsData = [
        {
          ...mockBoard,
          squares: [
            { id: 'square-1', paymentStatus: 'PAID', userId: 'user-1' },
            { id: 'square-2', paymentStatus: 'PENDING', userId: 'user-2' },
            { id: 'square-3', paymentStatus: 'PAID', userId: null },
          ],
          _count: { squares: 3 },
        },
      ]

      ;(prisma.board.findMany as jest.Mock).mockResolvedValue(mockBoardsData)

      const response = await request(app).get('/api/boards')

      expect(response.status).toBe(200)
      expect(response.body.boards).toHaveLength(1)
      expect(response.body.boards[0]).toMatchObject({
        id: 'board-1',
        name: 'Test Board',
        pricePerSquare: 10.0,
        status: 'OPEN',
        totalSquares: 3,
        claimedSquares: 2,
        paidSquares: 2,
      })
    })

    it('should handle database errors', async () => {
      ;(prisma.board.findMany as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app).get('/api/boards')

      expect(response.status).toBe(500)
      expect(response.body.error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('POST /api/boards', () => {
    const validBoardData = {
      name: 'New Test Board',
      pricePerSquare: 15.0,
      payoutStructure: {
        round1: 25.0,
        round2: 50.0,
        sweet16: 100.0,
        elite8: 200.0,
        final4: 400.0,
        championship: 800.0,
      },
    }

    it('should create a new board when admin authenticated', async () => {
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        return callback({
          board: { create: jest.fn().mockResolvedValue(mockBoard) },
          payoutStructure: { create: jest.fn().mockResolvedValue(mockPayoutStructure) },
        })
      })
      ;(prisma.$transaction as jest.Mock).mockImplementation(mockTransaction)

      const response = await request(app)
        .post('/api/boards')
        .set('Authorization', 'Bearer valid-admin-token')
        .send(validBoardData)

      expect(response.status).toBe(201)
      expect(response.body.message).toBe('Board created successfully')
      expect(response.body.board).toMatchObject({
        id: 'board-1',
        name: 'Test Board',
        pricePerSquare: 10.0,
        status: 'OPEN',
      })
    })

    it('should reject request without admin token', async () => {
      const response = await request(app)
        .post('/api/boards')
        .set('Authorization', 'Bearer valid-user-token')
        .send(validBoardData)

      expect(response.status).toBe(403)
      expect(response.body.error.code).toBe('ADMIN_REQUIRED')
    })

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/boards')
        .send(validBoardData)

      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('MISSING_TOKEN')
    })

    it('should validate required fields', async () => {
      const invalidData = {
        name: '',
        pricePerSquare: -5,
      }

      const response = await request(app)
        .post('/api/boards')
        .set('Authorization', 'Bearer valid-admin-token')
        .send(invalidData)

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /api/boards/:id', () => {
    it('should return board details with squares and statistics', async () => {
      const mockBoardDetail = {
        ...mockBoard,
        squares: [
          {
            id: 'square-1',
            gridPosition: 0,
            paymentStatus: 'PAID',
            winningTeamNumber: 5,
            losingTeamNumber: 3,
            user: { id: 'user-1', displayName: 'Test User' },
          },
        ],
        payoutStructure: mockPayoutStructure,
        games: [],
        _count: { squares: 1 },
      }

      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue(mockBoardDetail)

      const response = await request(app).get('/api/boards/board-1')

      expect(response.status).toBe(200)
      expect(response.body.board).toMatchObject({
        id: 'board-1',
        name: 'Test Board',
        totalSquares: 1,
        claimedSquares: 1,
        paidSquares: 1,
      })
      expect(response.body.board.squares).toHaveLength(1)
      expect(response.body.board.payoutStructure).toBeDefined()
    })

    it('should return 404 for non-existent board', async () => {
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue(null)

      const response = await request(app).get('/api/boards/non-existent')

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('BOARD_NOT_FOUND')
    })
  })

  describe('POST /api/boards/:id/claim', () => {
    const validClaimData = {
      numberOfSquares: 3,
    }

    beforeEach(() => {
      const mockBoardWithSquares = {
        ...mockBoard,
        squares: [], // User has no existing squares
        _count: { squares: 50 }, // 50 paid squares currently
      }
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue(mockBoardWithSquares)
    })

    it('should allow user to claim squares within limit', async () => {
      ;(prisma.square.createMany as jest.Mock).mockResolvedValue({ count: 3 })
      ;(prisma.square.findMany as jest.Mock).mockResolvedValue([
        { id: 'square-1', boardId: 'board-1', userId: 'user-1', paymentStatus: 'PENDING' },
        { id: 'square-2', boardId: 'board-1', userId: 'user-1', paymentStatus: 'PENDING' },
        { id: 'square-3', boardId: 'board-1', userId: 'user-1', paymentStatus: 'PENDING' },
      ])

      const response = await request(app)
        .post('/api/boards/board-1/claim')
        .set('Authorization', 'Bearer valid-user-token')
        .send(validClaimData)

      expect(response.status).toBe(201)
      expect(response.body.message).toBe('Successfully claimed 3 squares')
      expect(response.body.squares).toHaveLength(3)
      expect(response.body.totalUserSquares).toBe(3)
    })

    it('should reject claim if user would exceed 10 square limit', async () => {
      const mockBoardWithUserSquares = {
        ...mockBoard,
        squares: new Array(8).fill(null).map((_, i) => ({ id: `square-${i}`, userId: 'user-1' })), // User has 8 squares
        _count: { squares: 50 },
      }
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue(mockBoardWithUserSquares)

      const response = await request(app)
        .post('/api/boards/board-1/claim')
        .set('Authorization', 'Bearer valid-user-token')
        .send({ numberOfSquares: 5 }) // Would make 13 total

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('SQUARE_LIMIT_EXCEEDED')
    })

    it('should reject claim if board is not open', async () => {
      const closedBoard = { ...mockBoard, status: 'FILLED' as const, squares: [], _count: { squares: 0 } }
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue(closedBoard)

      const response = await request(app)
        .post('/api/boards/board-1/claim')
        .set('Authorization', 'Bearer valid-user-token')
        .send(validClaimData)

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('BOARD_NOT_OPEN')
    })

    it('should reject claim if board would exceed 100 total squares', async () => {
      const nearFullBoard = {
        ...mockBoard,
        squares: [],
        _count: { squares: 99 }, // 99 paid squares
      }
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue(nearFullBoard)
      ;(prisma.square.count as jest.Mock).mockResolvedValue(98) // 98 total squares (including pending)

      const response = await request(app)
        .post('/api/boards/board-1/claim')
        .set('Authorization', 'Bearer valid-user-token')
        .send({ numberOfSquares: 5 }) // Would make 103 total

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('BOARD_FULL')
    })

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/boards/board-1/claim')
        .send(validClaimData)

      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('MISSING_TOKEN')
    })

    it('should validate numberOfSquares input', async () => {
      const invalidData = { numberOfSquares: 15 } // Exceeds max of 10

      const response = await request(app)
        .post('/api/boards/board-1/claim')
        .set('Authorization', 'Bearer valid-user-token')
        .send(invalidData)

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 404 for non-existent board', async () => {
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .post('/api/boards/non-existent/claim')
        .set('Authorization', 'Bearer valid-user-token')
        .send(validClaimData)

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('BOARD_NOT_FOUND')
    })
  })

  describe('GET /api/boards/:id/scoring', () => {
    it('should return scoring table for a board', async () => {
      const mockBoardForScoring = {
        id: 'board-1',
        name: 'Test Board',
        status: 'ACTIVE',
      }

      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue(mockBoardForScoring)

      // Mock the getBoardScoringTable function
      const mockScoringTable = {
        games: [
          {
            id: 'game-1',
            gameNumber: 1,
            round: 'Round 1',
            team1: 'Duke',
            team2: 'UNC',
            team1Score: 78,
            team2Score: 74,
            status: 'COMPLETED',
            winnerSquare: {
              id: 'square-1',
              gridPosition: 84,
              winningTeamNumber: 8,
              losingTeamNumber: 4,
              user: {
                id: 'user-1',
                displayName: 'John Doe',
              },
            },
            payout: 25,
          },
        ],
      }

      ;(getBoardScoringTable as jest.Mock).mockResolvedValue(mockScoringTable)

      const response = await request(app).get('/api/boards/board-1/scoring')

      expect(response.status).toBe(200)
      expect(response.body.board).toMatchObject({
        id: 'board-1',
        name: 'Test Board',
        status: 'ACTIVE',
      })
      expect(response.body.scoringTable).toBeDefined()
    })

    it('should return 404 for non-existent board', async () => {
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue(null)

      const response = await request(app).get('/api/boards/non-existent/scoring')

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('BOARD_NOT_FOUND')
    })

    it('should handle empty board ID', async () => {
      const response = await request(app).get('/api/boards/ /scoring')

      expect(response.status).toBe(404) // Express treats this as a 404, not 400
    })
  })
})