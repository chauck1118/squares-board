import { hashPassword, comparePassword, generateToken, verifyToken, sanitizeUser } from '../../server/utils/auth'
import { User } from '@prisma/client'

describe('Auth Utils', () => {
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    passwordHash: 'hashed-password',
    isAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123'
      const hash = await hashPassword(password)
      
      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(50) // bcrypt hashes are typically 60 characters
    })

    it('should generate different hashes for the same password', async () => {
      const password = 'TestPassword123'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const password = 'TestPassword123'
      const hash = await hashPassword(password)
      const isValid = await comparePassword(password, hash)
      
      expect(isValid).toBe(true)
    })

    it('should return false for incorrect password', async () => {
      const password = 'TestPassword123'
      const wrongPassword = 'WrongPassword123'
      const hash = await hashPassword(password)
      const isValid = await comparePassword(wrongPassword, hash)
      
      expect(isValid).toBe(false)
    })
  })

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(mockUser)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    it('should include user data in token payload', () => {
      const token = generateToken(mockUser)
      const decoded = verifyToken(token)
      
      expect(decoded.userId).toBe(mockUser.id)
      expect(decoded.email).toBe(mockUser.email)
      expect(decoded.isAdmin).toBe(mockUser.isAdmin)
    })
  })

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const token = generateToken(mockUser)
      const decoded = verifyToken(token)
      
      expect(decoded.userId).toBe(mockUser.id)
      expect(decoded.email).toBe(mockUser.email)
      expect(decoded.isAdmin).toBe(mockUser.isAdmin)
    })

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here'
      
      expect(() => verifyToken(invalidToken)).toThrow()
    })
  })

  describe('sanitizeUser', () => {
    it('should return user data without sensitive fields', () => {
      const sanitized = sanitizeUser(mockUser)
      
      expect(sanitized.id).toBe(mockUser.id)
      expect(sanitized.email).toBe(mockUser.email)
      expect(sanitized.displayName).toBe(mockUser.displayName)
      expect(sanitized.isAdmin).toBe(mockUser.isAdmin)
      expect(sanitized).not.toHaveProperty('passwordHash')
      expect(sanitized).not.toHaveProperty('createdAt')
      expect(sanitized).not.toHaveProperty('updatedAt')
    })
  })
})