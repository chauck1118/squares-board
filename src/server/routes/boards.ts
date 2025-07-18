import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticateToken, requireAdmin } from '../middleware/auth'
import { createBoardSchema, claimSquaresSchema } from '../validation/boards'
import { getSocketInstance } from '../lib/socket'
import { broadcastSquareClaimed } from '../utils/socket'
import { getBoardScoringTable } from '../utils/scoring'

const router = Router()

/**
 * GET /api/boards
 * List all available boards with status indicators
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const boards = await prisma.board.findMany({
      include: {
        squares: {
          select: {
            id: true,
            paymentStatus: true,
            userId: true,
          },
        },
        _count: {
          select: {
            squares: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const boardsWithStats = boards.map(board => {
      const totalSquares = board._count.squares
      const paidSquares = board.squares.filter(s => s.paymentStatus === 'PAID').length
      const claimedSquares = board.squares.filter(s => s.userId !== null).length

      return {
        id: board.id,
        name: board.name,
        pricePerSquare: board.pricePerSquare,
        status: board.status,
        totalSquares,
        claimedSquares,
        paidSquares,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
      }
    })

    res.json({
      boards: boardsWithStats,
    })
  } catch (error) {
    console.error('Get boards error:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching boards',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    })
  }
})

/**
 * POST /api/boards
 * Create a new board (admin only)
 */
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = createBoardSchema.validate(req.body)
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

    const { name, pricePerSquare, payoutStructure } = value

    // Create board with payout structure in a transaction
    const board = await prisma.$transaction(async (tx) => {
      const newBoard = await tx.board.create({
        data: {
          name,
          pricePerSquare,
        },
      })

      await tx.payoutStructure.create({
        data: {
          boardId: newBoard.id,
          ...payoutStructure,
        },
      })

      return newBoard
    })

    res.status(201).json({
      message: 'Board created successfully',
      board: {
        id: board.id,
        name: board.name,
        pricePerSquare: board.pricePerSquare,
        status: board.status,
        createdAt: board.createdAt,
      },
    })
  } catch (error) {
    console.error('Create board error:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while creating the board',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    })
  }
})

/**
 * GET /api/boards/:id
 * Get board details with square information
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    if (!id) {
      res.status(400).json({
        error: {
          code: 'INVALID_BOARD_ID',
          message: 'Board ID is required',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      })
      return
    }

    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        squares: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
          orderBy: {
            gridPosition: 'asc',
          },
        },
        payoutStructure: true,
        games: {
          orderBy: {
            gameNumber: 'asc',
          },
        },
        _count: {
          select: {
            squares: true,
          },
        },
      },
    })

    if (!board) {
      res.status(404).json({
        error: {
          code: 'BOARD_NOT_FOUND',
          message: 'Board not found',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      })
      return
    }

    const totalSquares = board._count.squares
    const paidSquares = board.squares.filter(s => s.paymentStatus === 'PAID').length
    const claimedSquares = board.squares.filter(s => s.userId !== null).length

    res.json({
      board: {
        id: board.id,
        name: board.name,
        pricePerSquare: board.pricePerSquare,
        status: board.status,
        totalSquares,
        claimedSquares,
        paidSquares,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
        squares: board.squares,
        payoutStructure: board.payoutStructure,
        games: board.games,
      },
    })
  } catch (error) {
    console.error('Get board details error:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching board details',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    })
  }
})

/**
 * POST /api/boards/:id/claim
 * Claim squares on a board (0-10 limit validation)
 */
router.post('/:id/claim', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: boardId } = req.params
    const userId = req.user!.userId

    if (!boardId) {
      res.status(400).json({
        error: {
          code: 'INVALID_BOARD_ID',
          message: 'Board ID is required',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      })
      return
    }

    // Validate request body
    const { error, value } = claimSquaresSchema.validate(req.body)
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

    const { numberOfSquares } = value

    // Check if board exists and is open
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        squares: {
          where: {
            userId,
          },
        },
        _count: {
          select: {
            squares: {
              where: {
                paymentStatus: 'PAID',
              },
            },
          },
        },
      },
    })

    if (!board) {
      res.status(404).json({
        error: {
          code: 'BOARD_NOT_FOUND',
          message: 'Board not found',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      })
      return
    }

    if (board.status !== 'OPEN') {
      res.status(400).json({
        error: {
          code: 'BOARD_NOT_OPEN',
          message: 'Board is not accepting new participants',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      })
      return
    }

    // Check if user already has squares on this board
    const userCurrentSquares = board.squares.length
    const totalSquaresAfterClaim = userCurrentSquares + numberOfSquares

    if (totalSquaresAfterClaim > 10) {
      res.status(400).json({
        error: {
          code: 'SQUARE_LIMIT_EXCEEDED',
          message: `Cannot claim ${numberOfSquares} squares. You already have ${userCurrentSquares} squares. Maximum is 10 squares per user.`,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      })
      return
    }

    // Check if board would exceed 100 total squares (including pending)
    const currentTotalSquares = await prisma.square.count({
      where: { boardId },
    })
    
    if (currentTotalSquares + numberOfSquares > 100) {
      res.status(400).json({
        error: {
          code: 'BOARD_FULL',
          message: 'Not enough squares available on this board',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      })
      return
    }

    // Create the squares
    const squares = []
    for (let i = 0; i < numberOfSquares; i++) {
      squares.push({
        boardId,
        userId,
        paymentStatus: 'PENDING' as const,
      })
    }

    const createdSquares = await prisma.square.createMany({
      data: squares,
    })

    // Get the created squares to return
    const userSquares = await prisma.square.findMany({
      where: {
        boardId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    })

    // Broadcast square claim notification
    const io = getSocketInstance()
    if (io) {
      broadcastSquareClaimed(io, boardId, {
        userId,
        userName: userSquares[0]?.user?.displayName,
        numberOfSquares,
        totalUserSquares: userSquares.length,
        boardName: board.name
      })
    }

    res.status(201).json({
      message: `Successfully claimed ${numberOfSquares} squares`,
      squares: userSquares,
      totalUserSquares: userSquares.length,
    })
  } catch (error) {
    console.error('Claim squares error:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while claiming squares',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    })
  }
})

/**
 * GET /api/boards/:id/scoring
 * Get scoring table for a board showing all games and winners
 */
router.get('/:id/scoring', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: boardId } = req.params

    if (!boardId) {
      res.status(400).json({
        error: {
          code: 'INVALID_BOARD_ID',
          message: 'Board ID is required',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      })
      return
    }

    // Check if board exists
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: {
        id: true,
        name: true,
        status: true,
      },
    })

    if (!board) {
      res.status(404).json({
        error: {
          code: 'BOARD_NOT_FOUND',
          message: 'Board not found',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      })
      return
    }

    const scoringTable = await getBoardScoringTable(boardId)

    res.json({
      board: {
        id: board.id,
        name: board.name,
        status: board.status,
      },
      scoringTable,
    })
  } catch (error) {
    console.error('Get scoring table error:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching scoring table',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    })
  }
})

export default router