import { PrismaClient, GameStatus, BoardStatus, PaymentStatus } from '@prisma/client'
import { 
  determineWinnerFromScores, 
  findWinningSquare, 
  calculatePayout, 
  updateGameScore, 
  getBoardScoringTable 
} from '../../server/utils/scoring'

// Mock the prisma import
jest.mock('../../server/lib/prisma', () => ({
  prisma: {
    square: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    board: {
      findUnique: jest.fn(),
    },
    game: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

import { prisma } from '../../server/lib/prisma'

describe('Scoring Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('determineWinnerFromScores', () => {
    it('should correctly determine winner digits from scores', () => {
      const testCases = [
        { team1Score: 78, team2Score: 64, expectedWinning: 8, expectedLosing: 4 },
        { team1Score: 85, team2Score: 72, expectedWinning: 5, expectedLosing: 2 },
        { team1Score: 90, team2Score: 87, expectedWinning: 0, expectedLosing: 7 },
        { team1Score: 103, team2Score: 99, expectedWinning: 3, expectedLosing: 9 },
        { team1Score: 100, team2Score: 110, expectedWinning: 0, expectedLosing: 0 },
      ]

      testCases.forEach(({ team1Score, team2Score, expectedWinning, expectedLosing }) => {
        const result = determineWinnerFromScores(team1Score, team2Score)
        expect(result.winningDigit).toBe(expectedWinning)
        expect(result.losingDigit).toBe(expectedLosing)
      })
    })
  })

  describe('findWinningSquare', () => {
    it('should find the winning square based on score digits', async () => {
      const mockSquare = {
        id: 'square-1',
        boardId: 'board-1',
        userId: 'user-1',
        gridPosition: 42,
        paymentStatus: 'PAID' as PaymentStatus,
        winningTeamNumber: 8,
        losingTeamNumber: 4,
        createdAt: new Date(),
      }

      ;(prisma.square.findFirst as jest.Mock).mockResolvedValue(mockSquare)

      const result = await findWinningSquare('board-1', 78, 64)

      expect(prisma.square.findFirst).toHaveBeenCalledWith({
        where: {
          boardId: 'board-1',
          winningTeamNumber: 8,
          losingTeamNumber: 4,
          paymentStatus: 'PAID',
        },
      })
      expect(result).toBe('square-1')
    })

    it('should return null if no winning square found', async () => {
      ;(prisma.square.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await findWinningSquare('board-1', 78, 64)

      expect(result).toBeNull()
    })

    it('should only consider paid squares as winners', async () => {
      await findWinningSquare('board-1', 78, 64)

      expect(prisma.square.findFirst).toHaveBeenCalledWith({
        where: {
          boardId: 'board-1',
          winningTeamNumber: 8,
          losingTeamNumber: 4,
          paymentStatus: 'PAID', // Only paid squares can win
        },
      })
    })
  })

  describe('calculatePayout', () => {
    const mockPayoutStructure = {
      id: 'payout-1',
      boardId: 'board-1',
      round1: 25,
      round2: 50,
      sweet16: 100,
      elite8: 200,
      final4: 400,
      championship: 800,
    }

    beforeEach(() => {
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue({
        id: 'board-1',
        name: 'Test Board',
        payoutStructure: mockPayoutStructure,
      })
    })

    it('should calculate correct payout for each round', async () => {
      const testCases = [
        { round: 'Round 1', expectedPayout: 25 },
        { round: 'Round 2', expectedPayout: 50 },
        { round: 'Sweet 16', expectedPayout: 100 },
        { round: 'Elite 8', expectedPayout: 200 },
        { round: 'Final 4', expectedPayout: 400 },
        { round: 'Championship', expectedPayout: 800 },
      ]

      for (const { round, expectedPayout } of testCases) {
        const result = await calculatePayout('board-1', round)
        expect(result).toBe(expectedPayout)
      }
    })

    it('should return 0 for unknown round', async () => {
      const result = await calculatePayout('board-1', 'Unknown Round')
      expect(result).toBe(0)
    })

    it('should throw error if board not found', async () => {
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(calculatePayout('nonexistent-board', 'Round 1')).rejects.toThrow(
        'Board payout structure not found'
      )
    })

    it('should throw error if payout structure not found', async () => {
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue({
        id: 'board-1',
        name: 'Test Board',
        payoutStructure: null,
      })

      await expect(calculatePayout('board-1', 'Round 1')).rejects.toThrow(
        'Board payout structure not found'
      )
    })
  })

  describe('updateGameScore', () => {
    const mockGame = {
      id: 'game-1',
      boardId: 'board-1',
      gameNumber: 1,
      round: 'Round 1',
      team1: 'Duke',
      team2: 'Vermont',
      team1Score: null,
      team2Score: null,
      status: 'SCHEDULED' as GameStatus,
      winnerSquareId: null,
      scheduledTime: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      board: {
        id: 'board-1',
        name: 'Test Board',
        status: 'ACTIVE' as BoardStatus,
      },
    }

    const mockWinnerSquare = {
      id: 'square-1',
      boardId: 'board-1',
      userId: 'user-1',
      gridPosition: 42,
      paymentStatus: 'PAID' as PaymentStatus,
      winningTeamNumber: 8,
      losingTeamNumber: 4,
      createdAt: new Date(),
      user: {
        id: 'user-1',
        displayName: 'John Doe',
        email: 'john@example.com',
      },
    }

    beforeEach(() => {
      ;(prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame)
      ;(prisma.square.findFirst as jest.Mock).mockResolvedValue(mockWinnerSquare)
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue({
        id: 'board-1',
        name: 'Test Board',
        payoutStructure: {
          round1: 25,
          round2: 50,
          sweet16: 100,
          elite8: 200,
          final4: 400,
          championship: 800,
        },
      })
    })

    it('should successfully update game score and determine winner', async () => {
      const updatedGame = {
        ...mockGame,
        team1Score: 78,
        team2Score: 64,
        status: 'COMPLETED' as GameStatus,
        winnerSquareId: 'square-1',
        winnerSquare: mockWinnerSquare,
      }

      ;(prisma.game.update as jest.Mock).mockResolvedValue(updatedGame)
      ;(prisma.square.findUnique as jest.Mock).mockResolvedValue(mockWinnerSquare)

      const result = await updateGameScore('game-1', 78, 64, 'COMPLETED')

      expect(result.success).toBe(true)
      expect(result.message).toContain('Winner: John Doe')
      expect(result.game).toEqual(updatedGame)
      expect(result.winnerSquare).toEqual(mockWinnerSquare)
      expect(result.payout).toBe(25) // Round 1 payout

      expect(prisma.game.update).toHaveBeenCalledWith({
        where: { id: 'game-1' },
        data: {
          team1Score: 78,
          team2Score: 64,
          status: 'COMPLETED',
          winnerSquareId: 'square-1',
        },
        include: {
          board: true,
          winnerSquare: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  email: true,
                },
              },
            },
          },
        },
      })
    })

    it('should update game score without winner if no winning square found', async () => {
      ;(prisma.square.findFirst as jest.Mock).mockResolvedValue(null)

      const updatedGame = {
        ...mockGame,
        team1Score: 78,
        team2Score: 64,
        status: 'COMPLETED' as GameStatus,
        winnerSquareId: null,
      }

      ;(prisma.game.update as jest.Mock).mockResolvedValue(updatedGame)

      const result = await updateGameScore('game-1', 78, 64, 'COMPLETED')

      expect(result.success).toBe(true)
      expect(result.message).not.toContain('Winner:')
      expect(result.winnerSquare).toBeNull()
      expect(result.payout).toBe(0)
    })

    it('should update game score for in-progress status without determining winner', async () => {
      const updatedGame = {
        ...mockGame,
        team1Score: 45,
        team2Score: 38,
        status: 'IN_PROGRESS' as GameStatus,
        winnerSquareId: null,
      }

      ;(prisma.game.update as jest.Mock).mockResolvedValue(updatedGame)

      const result = await updateGameScore('game-1', 45, 38, 'IN_PROGRESS')

      expect(result.success).toBe(true)
      expect(result.winnerSquare).toBeNull()
      expect(result.payout).toBe(0)

      // Should not call findWinningSquare for non-completed games
      expect(prisma.square.findFirst).not.toHaveBeenCalled()
    })

    it('should return error if game not found', async () => {
      ;(prisma.game.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await updateGameScore('nonexistent-game', 78, 64)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Game not found')
    })

    it('should handle database errors gracefully', async () => {
      ;(prisma.game.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))

      const result = await updateGameScore('game-1', 78, 64)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to update game score')
    })
  })

  describe('getBoardScoringTable', () => {
    const mockGames = [
      {
        id: 'game-1',
        boardId: 'board-1',
        gameNumber: 1,
        round: 'Round 1',
        team1: 'Duke',
        team2: 'Vermont',
        team1Score: 78,
        team2Score: 64,
        status: 'COMPLETED' as GameStatus,
        winnerSquareId: 'square-1',
        scheduledTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        winnerSquare: {
          id: 'square-1',
          boardId: 'board-1',
          userId: 'user-1',
          gridPosition: 42,
          paymentStatus: 'PAID' as PaymentStatus,
          winningTeamNumber: 8,
          losingTeamNumber: 4,
          createdAt: new Date(),
          user: {
            id: 'user-1',
            displayName: 'John Doe',
          },
        },
      },
      {
        id: 'game-2',
        boardId: 'board-1',
        gameNumber: 2,
        round: 'Round 1',
        team1: 'North Carolina',
        team2: 'Wagner',
        team1Score: null,
        team2Score: null,
        status: 'SCHEDULED' as GameStatus,
        winnerSquareId: null,
        scheduledTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        winnerSquare: null,
      },
    ]

    beforeEach(() => {
      ;(prisma.game.findMany as jest.Mock).mockResolvedValue(mockGames)
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue({
        id: 'board-1',
        name: 'Test Board',
        payoutStructure: {
          round1: 25,
          round2: 50,
          sweet16: 100,
          elite8: 200,
          final4: 400,
          championship: 800,
        },
      })
    })

    it('should return scoring table with games and payouts', async () => {
      const result = await getBoardScoringTable('board-1')

      expect(result.games).toHaveLength(2)
      
      // First game (completed with winner)
      expect(result.games[0]).toEqual({
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
      })

      // Second game (scheduled, no winner)
      expect(result.games[1]).toEqual({
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
      })

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

    it('should handle games without winners', async () => {
      const gamesWithoutWinners = [
        {
          ...mockGames[0],
          status: 'COMPLETED' as GameStatus,
          winnerSquare: null,
        },
      ]

      ;(prisma.game.findMany as jest.Mock).mockResolvedValue(gamesWithoutWinners)

      const result = await getBoardScoringTable('board-1')

      expect(result.games[0]?.winnerSquare).toBeUndefined()
      expect(result.games[0]?.payout).toBeUndefined()
    })

    it('should handle payout calculation errors gracefully', async () => {
      ;(prisma.board.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await getBoardScoringTable('board-1')

      // Should still return games even if payout calculation fails
      expect(result.games).toHaveLength(2)
      expect(result.games[0]?.payout).toBeUndefined()
    })
  })
})