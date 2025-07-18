import { prisma } from '../lib/prisma'
import { GameStatus } from '@prisma/client'

/**
 * Determine winner square based on final score digits
 * Returns the square that matches the last digit of each team's score
 */
export function determineWinnerFromScores(team1Score: number, team2Score: number): {
  winningDigit: number
  losingDigit: number
} {
  return {
    winningDigit: team1Score % 10,
    losingDigit: team2Score % 10,
  }
}

/**
 * Find the winning square for a game based on final scores
 */
export async function findWinningSquare(
  boardId: string,
  team1Score: number,
  team2Score: number
): Promise<string | null> {
  const { winningDigit, losingDigit } = determineWinnerFromScores(team1Score, team2Score)

  const winningSquare = await prisma.square.findFirst({
    where: {
      boardId,
      winningTeamNumber: winningDigit,
      losingTeamNumber: losingDigit,
      paymentStatus: 'PAID', // Only paid squares can win
    },
  })

  return winningSquare?.id || null
}

/**
 * Calculate payout amount based on tournament round
 */
export async function calculatePayout(boardId: string, round: string): Promise<number> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { payoutStructure: true },
  })

  if (!board?.payoutStructure) {
    throw new Error('Board payout structure not found')
  }

  const { payoutStructure } = board

  // Map round names to payout amounts
  const roundPayouts: Record<string, number> = {
    'Round 1': payoutStructure.round1,
    'Round 2': payoutStructure.round2,
    'Sweet 16': payoutStructure.sweet16,
    'Elite 8': payoutStructure.elite8,
    'Final 4': payoutStructure.final4,
    'Championship': payoutStructure.championship,
  }

  return roundPayouts[round] || 0
}

/**
 * Update game score and determine winner
 */
export async function updateGameScore(
  gameId: string,
  team1Score: number,
  team2Score: number,
  status: GameStatus = 'COMPLETED'
): Promise<{
  success: boolean
  message: string
  game?: any
  winnerSquare?: any
  payout?: number
}> {
  try {
    // Get the game with board information
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { board: true },
    })

    if (!game) {
      return {
        success: false,
        message: 'Game not found',
      }
    }

    // Find winning square if game is completed
    let winnerSquareId: string | null = null
    let winnerSquare = null
    let payout = 0

    if (status === 'COMPLETED') {
      winnerSquareId = await findWinningSquare(game.boardId, team1Score, team2Score)
      
      if (winnerSquareId) {
        winnerSquare = await prisma.square.findUnique({
          where: { id: winnerSquareId },
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
        })
        
        payout = await calculatePayout(game.boardId, game.round)
      }
    }

    // Update the game
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        team1Score,
        team2Score,
        status,
        winnerSquareId,
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

    return {
      success: true,
      message: `Game score updated successfully${winnerSquare ? ` - Winner: ${winnerSquare.user?.displayName || 'Unknown'}` : ''}`,
      game: updatedGame,
      winnerSquare,
      payout,
    }
  } catch (error) {
    console.error('Update game score error:', error)
    return {
      success: false,
      message: 'Failed to update game score',
    }
  }
}

/**
 * Get scoring table for a board showing game results and winners
 */
export async function getBoardScoringTable(boardId: string): Promise<{
  games: Array<{
    id: string
    gameNumber: number
    round: string
    team1: string
    team2: string
    team1Score: number | null
    team2Score: number | null
    status: GameStatus
    winnerSquare?: {
      id: string
      gridPosition: number | null
      winningTeamNumber: number | null
      losingTeamNumber: number | null
      user?: {
        id: string
        displayName: string
      } | null
    } | undefined
    payout?: number | undefined
  }>
}> {
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

  const gamesWithPayouts = await Promise.all(
    games.map(async (game) => {
      let payout = 0
      if (game.status === 'COMPLETED' && game.winnerSquare) {
        try {
          payout = await calculatePayout(boardId, game.round)
        } catch (error) {
          console.error(`Error calculating payout for game ${game.id}:`, error)
        }
      }

      return {
        id: game.id,
        gameNumber: game.gameNumber,
        round: game.round,
        team1: game.team1,
        team2: game.team2,
        team1Score: game.team1Score,
        team2Score: game.team2Score,
        status: game.status,
        winnerSquare: game.winnerSquare ? {
          id: game.winnerSquare.id,
          gridPosition: game.winnerSquare.gridPosition,
          winningTeamNumber: game.winnerSquare.winningTeamNumber,
          losingTeamNumber: game.winnerSquare.losingTeamNumber,
          user: game.winnerSquare.user,
        } : undefined,
        payout: payout > 0 ? payout : undefined,
      }
    })
  )

  return { games: gamesWithPayouts }
}