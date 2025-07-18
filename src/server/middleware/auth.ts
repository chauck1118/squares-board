import { Request, Response, NextFunction } from 'express'
import { verifyToken, JWTPayload } from '../utils/auth'

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      error: {
        code: 'MISSING_TOKEN',
        message: 'Access token is required',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    })
    return
  }

  try {
    const decoded = verifyToken(token)
    req.user = decoded
    next()
  } catch (error) {
    res.status(403).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    })
    return
  }
}

/**
 * Middleware to require admin privileges
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
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

  if (!req.user.isAdmin) {
    res.status(403).json({
      error: {
        code: 'ADMIN_REQUIRED',
        message: 'Admin privileges required',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    })
    return
  }

  next()
}

/**
 * Optional authentication middleware - sets user if token is valid but doesn't require it
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (token) {
    try {
      const decoded = verifyToken(token)
      req.user = decoded
    } catch (error) {
      // Token is invalid but we don't fail the request
      // Just continue without setting req.user
    }
  }

  next()
}