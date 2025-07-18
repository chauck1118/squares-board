import { prisma } from '../lib/prisma'

/**
 * Utility functions for random square and number assignment
 */

/**
 * Generate a random permutation of numbers 0-9
 * Uses Fisher-Yates shuffle algorithm for unbiased randomization
 */
export function generateRandomNumbers(): number[] {
  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  
  // Fisher-Yates shuffle
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = numbers[i]!
    numbers[i] = numbers[j]!
    numbers[j] = temp
  }
  
  return numbers
}

/**
 * Generate a random permutation of grid positions 0-99
 * Uses Fisher-Yates shuffle algorithm for unbiased randomization
 */
export function generateRandomGridPositions(): number[] {
  const positions = Array.from({ length: 100 }, (_, i) => i)
  
  // Fisher-Yates shuffle
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = positions[i]!
    positions[i] = positions[j]!
    positions[j] = temp
  }
  
  return positions
}

/**
 * Assign random grid positions and numbers to all squares on a board
 * This function should only be called when a board has exactly 100 paid squares
 */
export async function assignSquaresToBoard(boardId: string): Promise<{
  success: boolean
  message: string
  assignedSquares?: number
  winningNumbers?: number[]
  losingNumbers?: number[]
}> {
  try {
    // Validate board exists and is in FILLED status
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        squares: {
          where: {
            paymentStatus: 'PAID',
          },
          orderBy: {
            createdAt: 'asc', // Assign in order of square claiming
          },
        },
      },
    })

    if (!board) {
      return {
        success: false,
        message: 'Board not found',
      }
    }

    if (board.status !== 'FILLED') {
      return {
        success: false,
        message: `Board must be in FILLED status for assignment. Current status: ${board.status}`,
      }
    }

    const paidSquares = board.squares
    if (paidSquares.length !== 100) {
      return {
        success: false,
        message: `Board must have exactly 100 paid squares for assignment. Current: ${paidSquares.length}`,
      }
    }

    // Check if squares are already assigned
    const alreadyAssigned = paidSquares.some(square => square.gridPosition !== null)
    if (alreadyAssigned) {
      return {
        success: false,
        message: 'Squares have already been assigned to this board',
      }
    }

    // Generate random assignments
    const randomGridPositions = generateRandomGridPositions()
    const winningNumbers = generateRandomNumbers() // Top row (0-9)
    const losingNumbers = generateRandomNumbers()  // Left column (0-9)

    // Perform assignment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update each square with its assigned position and numbers
      const updatePromises = paidSquares.map((square, index) => {
        const gridPosition = randomGridPositions[index]!
        const winningTeamNumber = winningNumbers[gridPosition % 10]! // Column (0-9)
        const losingTeamNumber = losingNumbers[Math.floor(gridPosition / 10)]! // Row (0-9)

        return tx.square.update({
          where: { id: square.id },
          data: {
            gridPosition,
            winningTeamNumber,
            losingTeamNumber,
          },
        })
      })

      await Promise.all(updatePromises)

      // Update board status to ASSIGNED
      await tx.board.update({
        where: { id: boardId },
        data: { status: 'ASSIGNED' },
      })

      return {
        assignedSquares: paidSquares.length,
        winningNumbers,
        losingNumbers,
      }
    })

    return {
      success: true,
      message: `Successfully assigned ${result.assignedSquares} squares to board`,
      assignedSquares: result.assignedSquares,
      winningNumbers: result.winningNumbers,
      losingNumbers: result.losingNumbers,
    }
  } catch (error) {
    console.error('Square assignment error:', error)
    return {
      success: false,
      message: 'An error occurred during square assignment',
    }
  }
}

/**
 * Check if a board is ready for assignment and trigger it automatically
 * This should be called after payment status updates
 */
export async function checkAndTriggerAssignment(boardId: string): Promise<{
  triggered: boolean
  message: string
  result?: any
}> {
  try {
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

    if (!board) {
      return {
        triggered: false,
        message: 'Board not found',
      }
    }

    const paidSquares = board._count.squares

    // Only trigger assignment if board is FILLED and has exactly 100 paid squares
    if (board.status === 'FILLED' && paidSquares === 100) {
      const assignmentResult = await assignSquaresToBoard(boardId)
      
      return {
        triggered: true,
        message: 'Assignment triggered automatically',
        result: assignmentResult,
      }
    }

    return {
      triggered: false,
      message: `Board not ready for assignment. Status: ${board.status}, Paid squares: ${paidSquares}`,
    }
  } catch (error) {
    console.error('Auto-assignment check error:', error)
    return {
      triggered: false,
      message: 'Error checking assignment eligibility',
    }
  }
}

/**
 * Validate square assignments for a board
 * Ensures no conflicts and all constraints are met
 */
export async function validateBoardAssignments(boardId: string): Promise<{
  valid: boolean
  errors: string[]
  stats?: {
    totalSquares: number
    assignedSquares: number
    uniquePositions: number
    winningNumberRange: [number, number]
    losingNumberRange: [number, number]
  }
}> {
  try {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        squares: {
          where: {
            paymentStatus: 'PAID',
          },
        },
      },
    })

    if (!board) {
      return {
        valid: false,
        errors: ['Board not found'],
      }
    }

    const errors: string[] = []
    const squares = board.squares

    // Check total squares count
    if (squares.length !== 100) {
      errors.push(`Expected 100 paid squares, found ${squares.length}`)
    }

    // Check that all squares have assignments if board is ASSIGNED
    if (board.status === 'ASSIGNED') {
      const unassignedSquares = squares.filter(s => 
        s.gridPosition === null || 
        s.winningTeamNumber === null || 
        s.losingTeamNumber === null
      )
      
      if (unassignedSquares.length > 0) {
        errors.push(`Found ${unassignedSquares.length} squares without complete assignments`)
      }

      // Check for duplicate grid positions
      const gridPositions = squares
        .map(s => s.gridPosition)
        .filter(pos => pos !== null) as number[]
      
      const uniquePositions = new Set(gridPositions)
      if (uniquePositions.size !== gridPositions.length) {
        errors.push('Found duplicate grid positions')
      }

      // Check grid position range (0-99)
      const invalidPositions = gridPositions.filter(pos => pos < 0 || pos > 99)
      if (invalidPositions.length > 0) {
        errors.push(`Found ${invalidPositions.length} grid positions outside valid range (0-99)`)
      }

      // Check winning/losing number ranges (0-9)
      const winningNumbers = squares
        .map(s => s.winningTeamNumber)
        .filter(num => num !== null) as number[]
      
      const losingNumbers = squares
        .map(s => s.losingTeamNumber)
        .filter(num => num !== null) as number[]

      const invalidWinningNumbers = winningNumbers.filter(num => num < 0 || num > 9)
      const invalidLosingNumbers = losingNumbers.filter(num => num < 0 || num > 9)

      if (invalidWinningNumbers.length > 0) {
        errors.push(`Found ${invalidWinningNumbers.length} winning numbers outside valid range (0-9)`)
      }

      if (invalidLosingNumbers.length > 0) {
        errors.push(`Found ${invalidLosingNumbers.length} losing numbers outside valid range (0-9)`)
      }

      // Provide stats for valid assignments
      if (errors.length === 0) {
        return {
          valid: true,
          errors: [],
          stats: {
            totalSquares: squares.length,
            assignedSquares: gridPositions.length,
            uniquePositions: uniquePositions.size,
            winningNumberRange: [Math.min(...winningNumbers), Math.max(...winningNumbers)],
            losingNumberRange: [Math.min(...losingNumbers), Math.max(...losingNumbers)],
          },
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  } catch (error) {
    console.error('Assignment validation error:', error)
    return {
      valid: false,
      errors: ['Error occurred during validation'],
    }
  }
}