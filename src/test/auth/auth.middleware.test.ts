import { Request, Response, NextFunction } from 'express'
import { authenticateToken, requireAdmin, optionalAuth } from '../../server/middleware/auth'
import { generateToken } from '../../server/utils/auth'
import { User } from '@prisma/client'

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction

  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    passwordHash: 'hashed-password',
    isAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockAdminUser: User = {
    ...mockUser,
    id: 'admin-user-id',
    email: 'admin@example.com',
    displayName: 'Admin User',
    isAdmin: true,
  }

  beforeEach(() => {
    mockRequest = {
      headers: {},
      path: '/test',
    }
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
    mockNext = jest.fn()
  })

  describe('authenticateToken', () => {
    it('should authenticate valid token', () => {
      const token = generateToken(mockUser)
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      }

      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockRequest.user).toBeDefined()
      expect(mockRequest.user?.userId).toBe(mockUser.id)
      expect(mockNext).toHaveBeenCalled()
    })

    it('should reject request without token', () => {
      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
        },
        timestamp: expect.any(String),
        path: '/test',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject invalid token', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      }

      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
        timestamp: expect.any(String),
        path: '/test',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle malformed authorization header', () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat',
      }

      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('requireAdmin', () => {
    it('should allow admin users', () => {
      const token = generateToken(mockAdminUser)
      mockRequest.user = {
        userId: mockAdminUser.id,
        email: mockAdminUser.email,
        isAdmin: true,
      }

      requireAdmin(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('should reject non-admin users', () => {
      mockRequest.user = {
        userId: mockUser.id,
        email: mockUser.email,
        isAdmin: false,
      }

      requireAdmin(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'ADMIN_REQUIRED',
          message: 'Admin privileges required',
        },
        timestamp: expect.any(String),
        path: '/test',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject unauthenticated users', () => {
      requireAdmin(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
        },
        timestamp: expect.any(String),
        path: '/test',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('optionalAuth', () => {
    it('should set user for valid token', () => {
      const token = generateToken(mockUser)
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      }

      optionalAuth(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockRequest.user).toBeDefined()
      expect(mockRequest.user?.userId).toBe(mockUser.id)
      expect(mockNext).toHaveBeenCalled()
    })

    it('should continue without user for invalid token', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      }

      optionalAuth(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockRequest.user).toBeUndefined()
      expect(mockNext).toHaveBeenCalled()
    })

    it('should continue without user when no token provided', () => {
      optionalAuth(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockRequest.user).toBeUndefined()
      expect(mockNext).toHaveBeenCalled()
    })
  })
})