import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { hashPassword, comparePassword, generateToken, sanitizeUser } from '../utils/auth'
import { registerSchema, loginSchema } from '../validation/auth'
import { authenticateToken } from '../middleware/auth'

const router = Router()

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = registerSchema.validate(req.body)
    if (error) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0]?.message || 'Validation error',
          details: error.details,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      })
      return
    }

    const { displayName, email, password } = value

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      res.status(409).json({
        error: {
          code: 'USER_EXISTS',
          message: 'A user with this email already exists',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      })
      return
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        displayName,
        email,
        passwordHash,
      },
    })

    // Generate token and return user data
    const token = generateToken(user)
    const userData = sanitizeUser(user)

    res.status(201).json({
      message: 'User registered successfully',
      user: userData,
      token,
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during registration',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    })
  }
})

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body)
    if (error) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0]?.message || 'Validation error',
          details: error.details,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      })
      return
    }

    const { email, password } = value

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      })
      return
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.passwordHash)
    if (!isValidPassword) {
      res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      })
      return
    }

    // Generate token and return user data
    const token = generateToken(user)
    const userData = sanitizeUser(user)

    res.json({
      message: 'Login successful',
      user: userData,
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during login',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    })
  }
})

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', authenticateToken, (req: Request, res: Response) => {
  // With JWT, logout is primarily handled client-side by removing the token
  // This endpoint exists for consistency and potential future server-side token blacklisting
  res.json({
    message: 'Logout successful',
  })
})

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      })
      return
    }

    // Fetch fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    })

    if (!user) {
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      })
      return
    }

    const userData = sanitizeUser(user)
    res.json({
      user: userData,
    })
  } catch (error) {
    console.error('Get user profile error:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching user profile',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    })
  }
})

export default router