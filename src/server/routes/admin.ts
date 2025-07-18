import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticateToken, requireAdmin } from '../middleware/auth'
import { updateSquarePaymentSchema, updateGameScoreSchema, createGameSchema } from '../validation/admin'
import { assignSquaresToBoard, checkAndTriggerAssignment, validateBoardAssignments } from '../utils/assignment'
import { updateGameScore, getBoardScoringTable, calculatePayout } from '../utils/scoring'
import { getSocketInstance } from '../lib/socket'
import { broadcastPaymentConfirmed, broadcastScoreUpdate, broadcastWinnerAnnounced, broadcastBoardAssigned, broadcastBoardStatusChange } from '../utils/socket'

const router = Router()

/**
 * PUT /api/admin/squares/:id/payment
 * Mark a square as paid (admin only)
 */
router.put('/squares/:id/payment', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: squareId } = req.params

    if (!squareId) {
      res.status(400).json({
        error: {
          code: 'INVALID_SQUARE_ID',
          message: 'Square ID is required',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      })
      return
    }

    // Validate request body
    const { error, value } = updateSquarePaymentSchema.validate(req.body)
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

    const { paymentStatus } = value

    // Check if square exists
    const existingSquare = await prisma.square.findUnique({
      where: { id: squareId },
      include: {
        board: true,
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    })

    if (!existingSquare) {
      res.status(404).json({
        error: {
          code: 'SQUARE_NOT_FOUND',
          message: 'Square not found',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      })
      return
    }

    // Update square payment status
    const updatedSquare = await prisma.square.update({
      where: { id: squareId },
      data: { paymentStatus },
      include: {
        board: true,
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    })

    // Broadcast payment confirmation if status is PAID
    if (paymentStatus === 'PAID' && updatedSquare.userId) {
      const io = getSocketInstance()
      if (io) {
        broadcastPaymentConfirmed(io, updatedSquare.boardId, updatedSquare.userId, {
          id: updatedSquare.id,
          boardName: updatedSquare.board.name,
          user: updatedSquare.user,
          gridPosition: updatedSquare.gridPosition,
          paymentStatus: updatedSquare.paymentStatus
        })
      }
    }

    // Check if board should be marked as filled after this payment update
    if (paymentStatus === 'PAID') {
      await checkAndUpdateBoardStatus(existingSquare.boardId)
    }

    res.json({
      message: `Square payment status updated to ${paymentStatus}`,
      square: {
        id: updatedSquare.id,
        boardId: updatedSquare.boardId,
        boardName: updatedSquare.board.name,
        userId: updatedSquare.userId,
        user: updatedSquare.user,
        paymentStatus: updatedSquare.paymentStatus,
        gridPosition: updatedSquare.gridPosition,
        createdAt: updatedSquare.createdAt,
      },
    })
  } catch (error) {
    console.error('Update square payment error:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while updating square payment status',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    })
  }
})

/**
 * GET /api/admin/boards/:id/payment-status
 * Get payment status overview for a board (admin only)
 */
router.get('/boards/:id/payment-status', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
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

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        squares: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
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

    const paymentStats = {
      totalSquares: board.squares.length,
      paidSquares: board.squares.filter(s => s.paymentStatus === 'PAID').length,
      pendingSquares: board.squares.filter(s => s.paymentStatus === 'PENDING').length,
    }

    const squaresByUser = board.squares.reduce((acc, square) => {
      if (!square.user) return acc
      
      const userId = square.user.id
      if (!acc[userId]) {
        acc[userId] = {
          user: square.user,
          squares: [],
          paidCount: 0,
          pendingCount: 0,
        }
      }
      
      acc[userId].squares.push({
        id: square.id,
        paymentStatus: square.paymentStatus,
        gridPosition: square.gridPosition,
        createdAt: square.createdAt,
      })
      
      if (square.paymentStatus === 'PAID') {
        acc[userId].paidCount++
      } else {
        acc[userId].pendingCount++
      }
      
      return acc
    }, {} as Record<string, any>)

    res.json({
      board: {
        id: board.id,
        name: board.name,
        status: board.status,
        pricePerSquare: board.pricePerSquare,
      },
      paymentStats,
      squaresByUser: Object.values(squaresByUser),
    })
  } catch (error) {
    console.error('Get board payment status error:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching board payment status',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    })
  }
})

/**
 * POST /api/admin/boards/:id/assign
 * Manually trigger square assignment for a filled board (admin only)
 */
router.post('/boards/:id/assign', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
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

    const result = await assignSquaresToBoard(boardId)

    if (!result.success) {
      res.status(400).json({
        error: {
          code: 'ASSIGNMENT_FAILED',
          message: result.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      })
      return
    }

    // Broadcast board assignment completion
    const io = getSocketInstance()
    if (io) {
      broadcastBoardAssigned(io, boardId, {
        assignedSquares: result.assignedSquares,
        winningNumbers: result.winningNumbers,
        losingNumbers: result.losingNumbers,
        message: result.message
      })
    }

    res.json({
      message: result.message,
      assignedSquares: result.assignedSquares,
      winningNumbers: result.winningNumbers,
      losingNumbers: result.losingNumbers,
    })
  } catch (error) {
    console.error('Manual square assignment error:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during square assignment',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    })
  }
})

/**
 * GET /api/admin/boards/:id/validate-assignments
 * Validate square assignments for a board (admin only)
 */
router.get('/boards/:id/validate-assignments', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
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

    const validation = await validateBoardAssignments(boardId)

    res.json({
      valid: validation.valid,
      errors: validation.errors,
      stats: validation.stats,
    })
  } catch (error) {
    console.error('Assignment validation error:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during assignment validation',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    })
  }
})

/**
 * POST /api/admin/boards/:id/games
 * Create a new game for a board (admin only)
 */
router.post('/boards/:id/games', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
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

    // Validate request body
    const { error, value } = createGameSchema.validate(req.body)
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

    const { gameNumber, round, team1, team2, scheduledTime } = value

    // Check if board exists
    const board = await prisma.board.findUnique({
      where: { id: boardId },
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

    // Create the game
    const game = await prisma.game.create({
      data: {
        boardId,
        gameNumber,
        round,
        team1,
        team2,
        scheduledTime: new Date(scheduledTime),
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

    res.status(201).json({
      message: 'Game created successfully',
      game: {
        id: game.id,
        boardId: game.boardId,
        boardName: game.board.name,
        gameNumber: game.gameNumber,
        round: game.round,
        team1: game.team1,
        team2: game.team2,
        team1Score: game.team1Score,
        team2Score: game.team2Score,
        status: game.status,
        scheduledTime: game.scheduledTime,
        createdAt: game.createdAt,
      },
    })
  } catch (error) {
    console.error('Create game error:', error)
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      res.status(400).json({
        error: {
          code: 'DUPLICATE_GAME',
          message: 'A game with this number already exists for this board',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      })
      return
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while creating the game',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    })
  }
})

/**
 * PUT /api/admin/games/:id/score
 * Update game score and determine winner (admin only)
 */
router.put('/games/:id/score', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: gameId } = req.params

    if (!gameId) {
      res.status(400).json({
        error: {
          code: 'INVALID_GAME_ID',
          message: 'Game ID is required',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      })
      return
    }

    // Validate request body
    const { error, value } = updateGameScoreSchema.validate(req.body)
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

    const { team1Score, team2Score, status } = value

    // Update the game score
    const result = await updateGameScore(gameId, team1Score, team2Score, status)

    if (!result.success) {
      res.status(400).json({
        error: {
          code: 'SCORE_UPDATE_FAILED',
          message: result.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      })
      return
    }

    // Broadcast score update to all board users
    const io = getSocketInstance()
    if (io) {
      broadcastScoreUpdate(io, result.game.boardId, {
        id: result.game.id,
        gameNumber: result.game.gameNumber,
        round: result.game.round,
        team1: result.game.team1,
        team2: result.game.team2,
        team1Score: result.game.team1Score,
        team2Score: result.game.team2Score,
        status: result.game.status,
        updatedAt: result.game.updatedAt
      })

      // If there's a winner, broadcast winner announcement
      if (result.winnerSquare && result.payout) {
        broadcastWinnerAnnounced(io, result.game.boardId, {
          game: {
            id: result.game.id,
            gameNumber: result.game.gameNumber,
            round: result.game.round,
            team1: result.game.team1,
            team2: result.game.team2,
            team1Score: result.game.team1Score,
            team2Score: result.game.team2Score
          },
          square: {
            id: result.winnerSquare.id,
            gridPosition: result.winnerSquare.gridPosition,
            winningTeamNumber: result.winnerSquare.winningTeamNumber,
            losingTeamNumber: result.winnerSquare.losingTeamNumber,
          },
          user: result.winnerSquare.user,
          payout: result.payout,
        })
      }
    }

    res.json({
      message: result.message,
      game: {
        id: result.game.id,
        boardId: result.game.boardId,
        boardName: result.game.board.name,
        gameNumber: result.game.gameNumber,
        round: result.game.round,
        team1: result.game.team1,
        team2: result.game.team2,
        team1Score: result.game.team1Score,
        team2Score: result.game.team2Score,
        status: result.game.status,
        scheduledTime: result.game.scheduledTime,
        updatedAt: result.game.updatedAt,
      },
      winner: result.winnerSquare ? {
        square: {
          id: result.winnerSquare.id,
          gridPosition: result.winnerSquare.gridPosition,
          winningTeamNumber: result.winnerSquare.winningTeamNumber,
          losingTeamNumber: result.winnerSquare.losingTeamNumber,
        },
        user: result.winnerSquare.user,
        payout: result.payout,
      } : null,
    })
  } catch (error) {
    console.error('Update game score error:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while updating game score',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    })
  }
})

/**
 * GET /api/admin/boards/:id/scoring-table
 * Get scoring table for a board showing all games and winners (admin only)
 */
router.get('/boards/:id/scoring-table', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
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

/**
 * GET /api/admin/boards/:id/games
 * Get all games for a board (admin only)
 */
router.get('/boards/:id/games', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
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

    const games = await prisma.game.findMany({
      where: { boardId },
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

    res.json({
      board: {
        id: board.id,
        name: board.name,
        status: board.status,
      },
      games: games.map(game => ({
        id: game.id,
        gameNumber: game.gameNumber,
        round: game.round,
        team1: game.team1,
        team2: game.team2,
        team1Score: game.team1Score,
        team2Score: game.team2Score,
        status: game.status,
        scheduledTime: game.scheduledTime,
        winnerSquare: game.winnerSquare ? {
          id: game.winnerSquare.id,
          gridPosition: game.winnerSquare.gridPosition,
          winningTeamNumber: game.winnerSquare.winningTeamNumber,
          losingTeamNumber: game.winnerSquare.losingTeamNumber,
          user: game.winnerSquare.user,
        } : null,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Get board games error:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching board games',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    })
  }
})

/**
 * Helper function to check and update board status based on paid squares
 * Also triggers automatic assignment when board reaches 100 paid squares
 */
async function checkAndUpdateBoardStatus(boardId: string): Promise<void> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
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

  if (!board) return

  const paidSquares = board._count.squares

  // If board has 100 paid squares and is still OPEN, mark it as FILLED
  if (paidSquares >= 100 && board.status === 'OPEN') {
    await prisma.board.update({
      where: { id: boardId },
      data: { status: 'FILLED' },
    })
    console.log(`Board ${boardId} marked as FILLED with ${paidSquares} paid squares`)
    
    // Broadcast board status change
    const io = getSocketInstance()
    if (io) {
      broadcastBoardStatusChange(io, boardId, 'FILLED', {
        paidSquares,
        message: 'Board is now filled and ready for assignment'
      })
    }
    
    // Trigger automatic assignment
    const assignmentResult = await checkAndTriggerAssignment(boardId)
    if (assignmentResult.triggered) {
      console.log(`Automatic assignment triggered for board ${boardId}:`, assignmentResult.result)
      
      // Broadcast assignment if it was successful
      if (io && assignmentResult.result?.success) {
        broadcastBoardAssigned(io, boardId, {
          assignedSquares: assignmentResult.result.assignedSquares,
          winningNumbers: assignmentResult.result.winningNumbers,
          losingNumbers: assignmentResult.result.losingNumbers,
          message: assignmentResult.result.message,
          automatic: true
        })
      }
    }
  }
}

export default router