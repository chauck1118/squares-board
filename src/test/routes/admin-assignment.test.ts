import request from 'supertest'
import { app } from '../../server/index'
import { prisma } from '../../server/lib/prisma'
import jwt from 'jsonwebtoken'

// Mock prisma
jest.mock('../../server/lib/prisma', () => ({
  prisma: {
    board: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    square: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

// Mock assignment utilities
jest.mock('../../server/utils/assignment', () => ({
  assignSquaresToBoard: jest.fn(),
  validateBoardAssignments: jest.fn(),
}))

const mockAssignSquaresToBoard = jest.fn()
const mockValidateBoardAssignments = jest.fn()

// Set up the mocks
require('../../server/utils/assignment').assignSquaresToBoard = mockAssignSquaresToBoard
require('../../server/utils/assignment').validateBoardAssignments = mockValidateBoardAssignments

describe('Admin Assignment Routes', () => {
  const adminToken = jwt.sign(
    { userId: 'admin-user-id', isAdmin: true },
    process.env.JWT_SECRET || 'test-secret'
  )
  
  const userToken = jwt.sign(
    { userId: 'regular-user-id', isAdmin: false },
    process.env.JWT_SECRET || 'test-secret'
  )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/admin/boards/:id/assign', () => {
    const boardId = 'test-board-id'

    it('should successfully trigger manual assignment', async () => {
      mockAssignSquaresToBoard.mockResolvedValue({
        success: true,
        message: 'Assignment successful',
        assignedSquares: 100,
        winningNumbers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        losingNumbers: [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
      })

      const response = await request(app)
        .post(`/api/admin/boards/${boardId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.message).toBe('Assignment successful')
      expect(response.body.assignedSquares).toBe(100)
      expect(response.body.winningNumbers).toHaveLength(10)
      expect(response.body.losingNumbers).toHaveLength(10)
      expect(mockAssignSquaresToBoard).toHaveBeenCalledWith(boardId)
    })

    it('should return error when assignment fails', async () => {
      mockAssignSquaresToBoard.mockResolvedValue({
        success: false,
        message: 'Board not in FILLED status',
      })

      const response = await request(app)
        .post(`/api/admin/boards/${boardId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400)

      expect(response.body.error.code).toBe('ASSIGNMENT_FAILED')
      expect(response.body.error.message).toBe('Board not in FILLED status')
    })

    it('should require admin authentication', async () => {
      await request(app)
        .post(`/api/admin/boards/${boardId}/assign`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)
    })

    it('should require authentication', async () => {
      await request(app)
        .post(`/api/admin/boards/${boardId}/assign`)
        .expect(401)
    })

    it('should validate board ID parameter', async () => {
      const response = await request(app)
        .post('/api/admin/boards//assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400)

      expect(response.body.error.code).toBe('INVALID_BOARD_ID')
    })

    it('should handle internal server errors', async () => {
      mockAssignSquaresToBoard.mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post(`/api/admin/boards/${boardId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500)

      expect(response.body.error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('GET /api/admin/boards/:id/validate-assignments', () => {
    const boardId = 'test-board-id'

    it('should successfully validate board assignments', async () => {
      mockValidateBoardAssignments.mockResolvedValue({
        valid: true,
        errors: [],
        stats: {
          totalSquares: 100,
          assignedSquares: 100,
          uniquePositions: 100,
          winningNumberRange: [0, 9],
          losingNumberRange: [0, 9],
        },
      })

      const response = await request(app)
        .get(`/api/admin/boards/${boardId}/validate-assignments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.valid).toBe(true)
      expect(response.body.errors).toHaveLength(0)
      expect(response.body.stats).toBeDefined()
      expect(response.body.stats.totalSquares).toBe(100)
      expect(mockValidateBoardAssignments).toHaveBeenCalledWith(boardId)
    })

    it('should return validation errors when assignments are invalid', async () => {
      mockValidateBoardAssignments.mockResolvedValue({
        valid: false,
        errors: [
          'Found duplicate grid positions',
          'Found 10 winning numbers outside valid range (0-9)',
        ],
      })

      const response = await request(app)
        .get(`/api/admin/boards/${boardId}/validate-assignments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.valid).toBe(false)
      expect(response.body.errors).toHaveLength(2)
      expect(response.body.errors).toContain('Found duplicate grid positions')
    })

    it('should require admin authentication', async () => {
      await request(app)
        .get(`/api/admin/boards/${boardId}/validate-assignments`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)
    })

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/admin/boards/${boardId}/validate-assignments`)
        .expect(401)
    })

    it('should validate board ID parameter', async () => {
      const response = await request(app)
        .get('/api/admin/boards//validate-assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400)

      expect(response.body.error.code).toBe('INVALID_BOARD_ID')
    })

    it('should handle internal server errors', async () => {
      mockValidateBoardAssignments.mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get(`/api/admin/boards/${boardId}/validate-assignments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500)

      expect(response.body.error.code).toBe('INTERNAL_ERROR')
    })
  })
})