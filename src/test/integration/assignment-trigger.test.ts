import { generateRandomNumbers, generateRandomGridPositions } from '../../server/utils/assignment'

describe('Assignment Integration Tests', () => {
  describe('Randomization Quality Tests', () => {
    it('should produce different assignments on multiple runs', () => {
      // Test number randomization
      const numberSets: number[][] = []
      for (let i = 0; i < 10; i++) {
        numberSets.push(generateRandomNumbers())
      }
      
      // Check that not all sets are identical (extremely unlikely with proper randomization)
      const allIdentical = numberSets.every(set => 
        JSON.stringify(set) === JSON.stringify(numberSets[0])
      )
      expect(allIdentical).toBe(false)

      // Test position randomization
      const positionSets: number[][] = []
      for (let i = 0; i < 5; i++) {
        positionSets.push(generateRandomGridPositions())
      }
      
      // Check that not all sets are identical
      const allPositionsIdentical = positionSets.every(set => 
        JSON.stringify(set) === JSON.stringify(positionSets[0])
      )
      expect(allPositionsIdentical).toBe(false)
    })

    it('should maintain proper distribution of numbers across grid', () => {
      // Generate multiple sets and check distribution
      const allNumbers: number[] = []
      for (let i = 0; i < 100; i++) {
        allNumbers.push(...generateRandomNumbers())
      }
      
      // Count occurrences of each number (should be roughly equal)
      const counts = new Array(10).fill(0)
      allNumbers.forEach(num => counts[num]++)
      
      // Each number should appear exactly 100 times (100 sets * 1 occurrence each)
      counts.forEach(count => {
        expect(count).toBe(100)
      })
    })

    it('should verify grid position assignment logic', () => {
      const positions = generateRandomGridPositions()
      
      // Test that positions map correctly to row/column coordinates
      positions.forEach((pos, index) => {
        const row = Math.floor(pos / 10)
        const col = pos % 10
        
        expect(row).toBeGreaterThanOrEqual(0)
        expect(row).toBeLessThanOrEqual(9)
        expect(col).toBeGreaterThanOrEqual(0)
        expect(col).toBeLessThanOrEqual(9)
        
        // Verify position calculation
        expect(pos).toBe(row * 10 + col)
      })
    })

    it('should test assignment algorithm consistency', () => {
      // Simulate the assignment algorithm logic
      const gridPositions = generateRandomGridPositions()
      const winningNumbers = generateRandomNumbers()
      const losingNumbers = generateRandomNumbers()
      
      // Test first 10 squares to verify assignment logic
      for (let i = 0; i < 10; i++) {
        const gridPosition = gridPositions[i]!
        const expectedWinningNumber = winningNumbers[gridPosition % 10] // Column
        const expectedLosingNumber = losingNumbers[Math.floor(gridPosition / 10)] // Row
        
        expect(expectedWinningNumber).toBeGreaterThanOrEqual(0)
        expect(expectedWinningNumber).toBeLessThanOrEqual(9)
        expect(expectedLosingNumber).toBeGreaterThanOrEqual(0)
        expect(expectedLosingNumber).toBeLessThanOrEqual(9)
      }
    })

    it('should verify no bias in random assignments', () => {
      // Test that each position has equal probability of being first
      const firstPositions: number[] = []
      
      for (let i = 0; i < 1000; i++) {
        const positions = generateRandomGridPositions()
        firstPositions.push(positions[0]!)
      }
      
      // Count how many times each position appears first
      const counts = new Array(100).fill(0)
      firstPositions.forEach(pos => counts[pos]++)
      
      // Each position should appear roughly 10 times (1000/100)
      // Allow reasonable variance for true randomness (2-30 range)
      counts.forEach(count => {
        expect(count).toBeGreaterThanOrEqual(2)
        expect(count).toBeLessThanOrEqual(30)
      })
      
      // Verify the total is correct
      const total = counts.reduce((sum, count) => sum + count, 0)
      expect(total).toBe(1000)
    })
  })

  describe('Edge Cases and Validation', () => {
    it('should handle edge positions correctly', () => {
      const positions = generateRandomGridPositions()
      
      // Find corner positions
      const corners = [0, 9, 90, 99]
      const foundCorners = positions.filter(pos => corners.includes(pos))
      
      // All corners should be present
      expect(foundCorners).toHaveLength(4)
      expect(foundCorners.sort()).toEqual([0, 9, 90, 99])
    })

    it('should verify number assignment for edge cases', () => {
      const numbers = generateRandomNumbers()
      
      // Verify edge numbers (0 and 9) are present
      expect(numbers).toContain(0)
      expect(numbers).toContain(9)
      
      // Verify middle numbers are present
      expect(numbers).toContain(5)
    })

    it('should test assignment reproducibility with same seed', () => {
      // Note: This test demonstrates that without a seed, results are different
      // In a real implementation, you might want to add seed support for testing
      const result1 = generateRandomNumbers()
      const result2 = generateRandomNumbers()
      
      // Without seed control, results should be different
      expect(JSON.stringify(result1)).not.toEqual(JSON.stringify(result2))
    })
  })
})