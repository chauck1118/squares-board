import request from 'supertest'
import express from 'express'
import authRoutes from '../../server/routes/auth'
import { generateToken } from '../../server/utils/auth'

// Mock Prisma
jest.mock('../../server/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

// Get the mocked prisma instance
const { prisma: mockPrisma } = require('../../server/lib/prisma')

// Create test app
const app = express()
app.use(express.json())
app.use('/api/auth', authRoutes)

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/register', () => {
    const validRegistrationData = {
      displayName: 'Test User',
      email: 'test@example.com',
      password: 'TestPassword123',
    }

    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: 'hashed-password',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null)
      mockPrisma.user.create = jest.fn().mockResolvedValue(mockUser)

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)

      expect(response.status).toBe(201)
      expect(response.body.message).toBe('User registered successfully')
      expect(response.body.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        displayName: mockUser.displayName,
        isAdmin: mockUser.isAdmin,
      })
      expect(response.body.token).toBeDefined()
    })

    it('should reject registration with existing email', async () => {
      const existingUser = {
        id: 'existing-user-id',
        email: 'test@example.com',
        displayName: 'Existing User',
        passwordHash: 'hashed-password',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(existingUser)

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)

      expect(response.status).toBe(409)
      expect(response.body.error.code).toBe('USER_EXISTS')
    })

    it('should reject registration with invalid data', async () => {
      const invalidData = {
        displayName: 'A', // Too short
        email: 'invalid-email',
        password: '123', // Too short and no uppercase/lowercase
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('POST /api/auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'TestPassword123',
    }

    it('should login user with valid credentials', async () => {
      // Generate a real bcrypt hash for the test password
      const bcrypt = require('bcrypt')
      const passwordHash = await bcrypt.hash('TestPassword123', 12)
      
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash,
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser)

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Login successful')
      expect(response.body.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        displayName: mockUser.displayName,
        isAdmin: mockUser.isAdmin,
      })
      expect(response.body.token).toBeDefined()
    })

    it('should reject login with non-existent email', async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null)

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)

      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
    })

    it('should reject login with invalid password', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: '$2b$12$differenthash',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser)

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123',
        })

      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
    })

    it('should reject login with invalid data', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: '',
        })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout authenticated user', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: 'hashed-password',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const token = generateToken(mockUser)

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Logout successful')
    })

    it('should reject logout without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout')

      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('MISSING_TOKEN')
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return user profile for authenticated user', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: 'hashed-password',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser)
      const token = generateToken(mockUser)

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200)
      expect(response.body.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        displayName: mockUser.displayName,
        isAdmin: mockUser.isAdmin,
      })
    })

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/me')

      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('MISSING_TOKEN')
    })

    it('should handle user not found', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: 'hashed-password',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null)
      const token = generateToken(mockUser)

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('USER_NOT_FOUND')
    })
  })
})