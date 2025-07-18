import request from 'supertest'
import express from 'express'
import { prisma } from '../../server/lib/prisma'
import adminRoutes from '../../server/routes/admin'
import { authenticateToken, requireAdmin } from '../../server/middleware/auth'
import { updateGameScore, getBoardScoringTable } from '../../server/utils/scoring'

// Mock Prisma
jest.mock('../../server/lib/prisma', () => ({
  prisma: {
    square: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    board: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    game: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

// Mock the middleware
jest.mock('../../server/middleware/auth')

// Mock scoring utilities
jest.mock('../../server/utils/scoring')

const app = express()
app.use(express.json())
app.use('/api/admin', adminRoutes)

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

const mockSquare = {
  id: 'square-1',
  boardId: 'board-1',
  userId: 'user-1',
  gridPosition: null,
  paymentStatus: 'PENDING' as const,
  winningTeamNumber: null,
  losingTeamNumber: null,
  createdAt: new Date(),
}

describe('Admin Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock authentication middleware
    ;(authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
      const authHeader = req.headers.authorization
      if (!authHeader) {
        return res.status(401).json({ error: { code: 'NO_TOKEN', message: 'No token provided' } })
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
    })
    
    ;(requireAdmin as jest.Mock).mockImplementation((req, res, next) => {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ error: { code: 'ADMIN_REQUIRED', message: 'Admin privileges required' } })
      }
      next()
    })
  })

  describe('PUT /api/admin/squares/:id/payment', () => {
    it('should update square payment status when admin authenticated', async () => {
      const updatedSquare = {
        ...mockSquare,
        paymentStatus: 'PAID' as const,
        board: mockBoard,
        user: {
          id: mockUser.id,
          displayName: mockUser.displayName,
        },
      }

      // Mock Prisma calls
      ;(prisma.square.findUnique as jest.Mock).mockResolvedValue({
        ...mockSquare,
        board: mockBoard,
        user: {
          id: mockUser.id,
          displayName: mockUser.displayName,
        },
      })
      
      ;(prisma.square.update as jest.Mock).mockResolvedValue(updatedSquare)
      
      // Mock board status check
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue({
        ...mockBoard,
        _count: { squares: 99 }, // Not quite full yet
      })

      const response = await request(app)
        .put('/api/admin/squares/square-1/payment')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ paymentStatus: 'PAID' })

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Square payment status updated to PAID')
      expect(response.body.square.paymentStatus).toBe('PAID')
      expect(response.body.square.id).toBe('square-1')
      expect(response.body.square.user.displayName).toBe('Test User')
    })

    it('should reject request without admin token', async () => {
      const response = await request(app)
        .put('/api/admin/squares/square-1/payment')
        .set('Authorization', 'Bearer valid-user-token')
        .send({ paymentStatus: 'PAID' })

      expect(response.status).toBe(403)
      expect(response.body.error.code).toBe('ADMIN_REQUIRED')
    })

    it('should return 404 for non-existent square', async () => {
      ;(prisma.square.findUnique as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .put('/api/admin/squares/non-existent/payment')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ paymentStatus: 'PAID' })

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('SQUARE_NOT_FOUND')
    })

    it('should validate payment status values', async () => {
      const response = await request(app)
        .put('/api/admin/squares/square-1/payment')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ paymentStatus: 'INVALID_STATUS' })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should mark board as FILLED when 100th square is paid', async () => {
      const updatedSquare = {
        ...mockSquare,
        paymentStatus: 'PAID' as const,
        board: mockBoard,
        user: {
          id: mockUser.id,
          displayName: mockUser.displayName,
        },
      }

      ;(prisma.square.findUnique as jest.Mock).mockResolvedValue({
        ...mockSquare,
        board: mockBoard,
        user: {
          id: mockUser.id,
          displayName: mockUser.displayName,
        },
      })
      
      ;(prisma.square.update as jest.Mock).mockResolvedValue(updatedSquare)
      
      // Mock board with exactly 100 paid squares after this update
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue({
        ...mockBoard,
        _count: { squares: 100 },
      })
      
      ;(prisma.board.update as jest.Mock).mockResolvedValue({
        ...mockBoard,
        status: 'FILLED',
      })

      const response = await request(app)
        .put('/api/admin/squares/square-1/payment')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({ paymentStatus: 'PAID' })

      expect(response.status).toBe(200)
      expect(prisma.board.update).toHaveBeenCalledWith({
        where: { id: 'board-1' },
        data: { status: 'FILLED' },
      })
    })
  })

  describe('GET /api/admin/boards/:id/payment-status', () => {
    it('should return payment status overview for admin', async () => {
      const boardWithSquares = {
        ...mockBoard,
        squares: [
          {
            ...mockSquare,
            id: 'square-1',
            paymentStatus: 'PAID' as const,
            user: { id: 'user-1', displayName: 'User 1', email: 'user1@example.com' },
            createdAt: new Date(),
          },
          {
            ...mockSquare,
            id: 'square-2',
            paymentStatus: 'PENDING' as const,
            user: { id: 'user-1', displayName: 'User 1', email: 'user1@example.com' },
            createdAt: new Date(),
          },
          {
            ...mockSquare,
            id: 'square-3',
            paymentStatus: 'PAID' as const,
            user: { id: 'user-2', displayName: 'User 2', email: 'user2@example.com' },
            createdAt: new Date(),
          },
        ],
      }

      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue(boardWithSquares)

      const response = await request(app)
        .get('/api/admin/boards/board-1/payment-status')
        .set('Authorization', 'Bearer valid-admin-token')

      expect(response.status).toBe(200)
      expect(response.body.board.id).toBe('board-1')
      expect(response.body.paymentStats.totalSquares).toBe(3)
      expect(response.body.paymentStats.paidSquares).toBe(2)
      expect(response.body.paymentStats.pendingSquares).toBe(1)
      expect(response.body.squaresByUser).toHaveLength(2)
    })

    it('should reject request without admin token', async () => {
      const response = await request(app)
        .get('/api/admin/boards/board-1/payment-status')
        .set('Authorization', 'Bearer valid-user-token')

      expect(response.status).toBe(403)
      expect(response.body.error.code).toBe('ADMIN_REQUIRED')
    })

    it('should return 404 for non-existent board', async () => {
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .get('/api/admin/boards/non-existent/payment-status')
        .set('Authorization', 'Bearer valid-admin-token')

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('BOARD_NOT_FOUND')
    })
  })

  describe('POST /api/admin/boards/:id/games', () => {
    const mockGame = {
      id: 'game-1',
      boardId: 'board-1',
      gameNumber: 1,
      round: 'Round 1',
      team1: 'Duke',
      team2: 'Vermont',
      team1Score: null,
      team2Score: null,
      status: 'SCHEDULED' as const,
      winnerSquareId: null,
      scheduledTime: new Date('2024-03-21T12:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
      board: {
        id: 'board-1',
        name: 'Test Board',
      },
    }

    it('should create a new game for admin', async () => {
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue(mockBoard)
      ;(prisma.game.create as jest.Mock).mockResolvedValue(mockGame)

      const gameData = {
        gameNumber: 1,
        round: 'Round 1',
        team1: 'Duke',
        team2: 'Vermont',
        scheduledTime: '2024-03-21T12:00:00Z',
      }

      const response = await request(app)
        .post('/api/admin/boards/board-1/games')
        .set('Authorization', 'Bearer valid-admin-token')
        .send(gameData)

      expect(response.status).toBe(201)
      expect(response.body.message).toBe('Game created successfully')
      expect(response.body.game.gameNumber).toBe(1)
      expect(response.body.game.team1).toBe('Duke')
      expect(response.body.game.team2).toBe('Vermont')
      expect(response.body.game.round).toBe('Round 1')
      expect(response.body.game.status).toBe('SCHEDULED')

      expect(prisma.game.create).toHaveBeenCalledWith({
        data: {
          boardId: 'board-1',
          gameNumber: 1,
          round: 'Round 1',
          team1: 'Duke',
          team2: 'Vermont',
          scheduledTime: new Date('2024-03-21T12:00:00Z'),
        },
        include: {
          board: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
    })

    it('should reject request without admin token', async () => {
      const response = await request(app)
        .post('/api/admin/boards/board-1/games')
        .set('Authorization', 'Bearer valid-user-token')
        .send({
          gameNumber: 1,
          round: 'Round 1',
          team1: 'Duke',
          team2: 'Vermont',
          scheduledTime: '2024-03-21T12:00:00Z',
        })

      expect(response.status).toBe(403)
      expect(response.body.error.code).toBe('ADMIN_REQUIRED')
    })

    it('should return 404 for non-existent board', async () => {
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .post('/api/admin/boards/non-existent/games')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({
          gameNumber: 1,
          round: 'Round 1',
          team1: 'Duke',
          team2: 'Vermont',
          scheduledTime: '2024-03-21T12:00:00Z',
        })

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('BOARD_NOT_FOUND')
    })

    it('should validate game data', async () => {
      const response = await request(app)
        .post('/api/admin/boards/board-1/games')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({
          gameNumber: 'invalid',
          round: 'Invalid Round',
          team1: '',
          team2: 'Vermont',
          scheduledTime: 'invalid-date',
        })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should handle duplicate game number error', async () => {
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue(mockBoard)
      ;(prisma.game.create as jest.Mock).mockRejectedValue(
        new Error('Unique constraint failed on the fields: (`boardId`,`gameNumber`)')
      )

      const response = await request(app)
        .post('/api/admin/boards/board-1/games')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({
          gameNumber: 1,
          round: 'Round 1',
          team1: 'Duke',
          team2: 'Vermont',
          scheduledTime: '2024-03-21T12:00:00Z',
        })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('DUPLICATE_GAME')
    })
  })

  describe('PUT /api/admin/games/:id/score', () => {
    it('should update game score successfully', async () => {
      const mockResult = {
        success: true,
        message: 'Game score updated successfully - Winner: John Doe',
        game: {
          id: 'game-1',
          boardId: 'board-1',
          board: { name: 'Test Board' },
          gameNumber: 1,
          round: 'Round 1',
          team1: 'Duke',
          team2: 'Vermont',
          team1Score: 78,
          team2Score: 64,
          status: 'COMPLETED',
          scheduledTime: new Date(),
          updatedAt: new Date(),
        },
        winnerSquare: {
          id: 'square-1',
          gridPosition: 42,
          winningTeamNumber: 8,
          losingTeamNumber: 4,
          user: {
            id: 'user-1',
            displayName: 'John Doe',
            email: 'john@example.com',
          },
        },
        payout: 25,
      }

      ;(updateGameScore as jest.Mock).mockResolvedValue(mockResult)

      const response = await request(app)
        .put('/api/admin/games/game-1/score')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({
          team1Score: 78,
          team2Score: 64,
          status: 'COMPLETED',
        })

      expect(response.status).toBe(200)
      expect(response.body.message).toContain('Winner: John Doe')
      expect(response.body.game.team1Score).toBe(78)
      expect(response.body.game.team2Score).toBe(64)
      expect(response.body.game.status).toBe('COMPLETED')
      expect(response.body.winner.payout).toBe(25)
      expect(response.body.winner.user.displayName).toBe('John Doe')

      expect(updateGameScore).toHaveBeenCalledWith('game-1', 78, 64, 'COMPLETED')
    })

    it('should reject request without admin token', async () => {
      const response = await request(app)
        .put('/api/admin/games/game-1/score')
        .set('Authorization', 'Bearer valid-user-token')
        .send({
          team1Score: 78,
          team2Score: 64,
        })

      expect(response.status).toBe(403)
      expect(response.body.error.code).toBe('ADMIN_REQUIRED')
    })

    it('should validate score data', async () => {
      const response = await request(app)
        .put('/api/admin/games/game-1/score')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({
          team1Score: -5,
          team2Score: 'invalid',
          status: 'INVALID_STATUS',
        })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should handle score update failure', async () => {
      ;(updateGameScore as jest.Mock).mockResolvedValue({
        success: false,
        message: 'Game not found',
      })

      const response = await request(app)
        .put('/api/admin/games/non-existent/score')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({
          team1Score: 78,
          team2Score: 64,
        })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('SCORE_UPDATE_FAILED')
      expect(response.body.error.message).toBe('Game not found')
    })

    it('should handle game without winner', async () => {
      const mockResult = {
        success: true,
        message: 'Game score updated successfully',
        game: {
          id: 'game-1',
          boardId: 'board-1',
          board: { name: 'Test Board' },
          gameNumber: 1,
          round: 'Round 1',
          team1: 'Duke',
          team2: 'Vermont',
          team1Score: 78,
          team2Score: 64,
          status: 'COMPLETED',
          scheduledTime: new Date(),
          updatedAt: new Date(),
        },
        winnerSquare: null,
        payout: 0,
      }

      ;(updateGameScore as jest.Mock).mockResolvedValue(mockResult)

      const response = await request(app)
        .put('/api/admin/games/game-1/score')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({
          team1Score: 78,
          team2Score: 64,
        })

      expect(response.status).toBe(200)
      expect(response.body.winner).toBeNull()
    })
  })

  describe('GET /api/admin/boards/:id/scoring-table', () => {
    it('should return scoring table for admin', async () => {
      const mockScoringTable = {
        games: [
          {
            id: 'game-1',
            gameNumber: 1,
            round: 'Round 1',
            team1: 'Duke',
            team2: 'Vermont',
            team1Score: 78,
            team2Score: 64,
            status: 'COMPLETED',
            winnerSquare: {
              id: 'square-1',
              gridPosition: 42,
              winningTeamNumber: 8,
              losingTeamNumber: 4,
              user: {
                id: 'user-1',
                displayName: 'John Doe',
              },
            },
            payout: 25,
          },
          {
            id: 'game-2',
            gameNumber: 2,
            round: 'Round 1',
            team1: 'North Carolina',
            team2: 'Wagner',
            team1Score: null,
            team2Score: null,
            status: 'SCHEDULED',
            winnerSquare: undefined,
            payout: undefined,
          },
        ],
      }

      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue({
        id: 'board-1',
        name: 'Test Board',
        status: 'ACTIVE',
      })
      ;(getBoardScoringTable as jest.Mock).mockResolvedValue(mockScoringTable)

      const response = await request(app)
        .get('/api/admin/boards/board-1/scoring-table')
        .set('Authorization', 'Bearer valid-admin-token')

      expect(response.status).toBe(200)
      expect(response.body.board.id).toBe('board-1')
      expect(response.body.board.name).toBe('Test Board')
      expect(response.body.scoringTable.games).toHaveLength(2)
      expect(response.body.scoringTable.games[0].winnerSquare.user.displayName).toBe('John Doe')
      expect(response.body.scoringTable.games[0].payout).toBe(25)
      expect(response.body.scoringTable.games[1].winnerSquare).toBeUndefined()

      expect(getBoardScoringTable).toHaveBeenCalledWith('board-1')
    })

    it('should reject request without admin token', async () => {
      const response = await request(app)
        .get('/api/admin/boards/board-1/scoring-table')
        .set('Authorization', 'Bearer valid-user-token')

      expect(response.status).toBe(403)
      expect(response.body.error.code).toBe('ADMIN_REQUIRED')
    })

    it('should return 404 for non-existent board', async () => {
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .get('/api/admin/boards/non-existent/scoring-table')
        .set('Authorization', 'Bearer valid-admin-token')

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('BOARD_NOT_FOUND')
    })
  })

  describe('GET /api/admin/boards/:id/games', () => {
    const mockGames = [
      {
        id: 'game-1',
        gameNumber: 1,
        round: 'Round 1',
        team1: 'Duke',
        team2: 'Vermont',
        team1Score: 78,
        team2Score: 64,
        status: 'COMPLETED',
        scheduledTime: new Date('2024-03-21T12:00:00Z'),
        winnerSquare: {
          id: 'square-1',
          gridPosition: 42,
          winningTeamNumber: 8,
          losingTeamNumber: 4,
          user: {
            id: 'user-1',
            displayName: 'John Doe',
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'game-2',
        gameNumber: 2,
        round: 'Round 1',
        team1: 'North Carolina',
        team2: 'Wagner',
        team1Score: null,
        team2Score: null,
        status: 'SCHEDULED',
        scheduledTime: new Date('2024-03-21T14:30:00Z'),
        winnerSquare: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    it('should return all games for a board', async () => {
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue({
        id: 'board-1',
        name: 'Test Board',
        status: 'ACTIVE',
      })
      ;(prisma.game.findMany as jest.Mock).mockResolvedValue(mockGames)

      const response = await request(app)
        .get('/api/admin/boards/board-1/games')
        .set('Authorization', 'Bearer valid-admin-token')

      expect(response.status).toBe(200)
      expect(response.body.board.id).toBe('board-1')
      expect(response.body.games).toHaveLength(2)
      expect(response.body.games[0].gameNumber).toBe(1)
      expect(response.body.games[0].winnerSquare.user.displayName).toBe('John Doe')
      expect(response.body.games[1].winnerSquare).toBeNull()

      expect(prisma.game.findMany).toHaveBeenCalledWith({
        where: { boardId: 'board-1' },
        include: {
          winnerSquare: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
            },
          },
        },
        orderBy: { gameNumber: 'asc' },
      })
    })

    it('should reject request without admin token', async () => {
      const response = await request(app)
        .get('/api/admin/boards/board-1/games')
        .set('Authorization', 'Bearer valid-user-token')

      expect(response.status).toBe(403)
      expect(response.body.error.code).toBe('ADMIN_REQUIRED')
    })

    it('should return 404 for non-existent board', async () => {
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .get('/api/admin/boards/non-existent/games')
        .set('Authorization', 'Bearer valid-admin-token')

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('BOARD_NOT_FOUND')
    })
  })
})