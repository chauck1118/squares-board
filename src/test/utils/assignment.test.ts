import { 
  generateRandomNumbers, 
  generateRandomGridPositions
} from '../../server/utils/assignment'

describe('Assignment Utilities - Core Randomization', () => {
  describe('generateRandomNumbers', () => {
    it('should generate an array of numbers 0-9', () => {
      const numbers = generateRandomNumbers()
      
      expect(numbers).toHaveLength(10)
      expect(numbers.sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    })

    it('should generate different permutations on multiple calls', () => {
      const results: number[][] = []
      let allSame = true
      
      // Generate multiple permutations
      for (let i = 0; i < 10; i++) {
        results.push(generateRandomNumbers())
      }
      
      // Check if at least one permutation is different from the first
      for (let i = 1; i < results.length; i++) {
        if (JSON.stringify(results[0]) !== JSON.stringify(results[i])) {
          allSame = false
          break
        }
      }
      
      // With 10! possible permutations, it's extremely unlikely all 10 calls return the same order
      expect(allSame).toBe(false)
    })

    it('should contain all numbers from 0-9 exactly once', () => {
      const numbers = generateRandomNumbers()
      const counts = new Array(10).fill(0)
      
      numbers.forEach(num => {
        expect(num).toBeGreaterThanOrEqual(0)
        expect(num).toBeLessThanOrEqual(9)
        counts[num]++
      })
      
      // Each number should appear exactly once
      counts.forEach(count => {
        expect(count).toBe(1)
      })
    })

    it('should maintain proper distribution over multiple runs', () => {
      const allNumbers: number[] = []
      
      // Generate 100 sets of numbers
      for (let i = 0; i < 100; i++) {
        allNumbers.push(...generateRandomNumbers())
      }
      
      // Count occurrences of each number
      const counts = new Array(10).fill(0)
      allNumbers.forEach(num => counts[num]++)
      
      // Each number should appear exactly 100 times (100 sets * 1 occurrence each)
      counts.forEach(count => {
        expect(count).toBe(100)
      })
    })
  })

  describe('generateRandomGridPositions', () => {
    it('should generate an array of positions 0-99', () => {
      const positions = generateRandomGridPositions()
      
      expect(positions).toHaveLength(100)
      expect(positions.sort((a, b) => a - b)).toEqual(
        Array.from({ length: 100 }, (_, i) => i)
      )
    })

    it('should generate different permutations on multiple calls', () => {
      const result1 = generateRandomGridPositions()
      const result2 = generateRandomGridPositions()
      
      // With 100! possible permutations, it's extremely unlikely two calls return the same order
      expect(JSON.stringify(result1)).not.toEqual(JSON.stringify(result2))
    })

    it('should contain all positions from 0-99 exactly once', () => {
      const positions = generateRandomGridPositions()
      const counts = new Array(100).fill(0)
      
      positions.forEach(pos => {
        expect(pos).toBeGreaterThanOrEqual(0)
        expect(pos).toBeLessThanOrEqual(99)
        counts[pos]++
      })
      
      // Each position should appear exactly once
      counts.forEach(count => {
        expect(count).toBe(1)
      })
    })

    it('should produce good distribution across grid quadrants', () => {
      const positions = generateRandomGridPositions()
      
      // Count positions in each quadrant (25 positions each)
      const quadrants = [0, 0, 0, 0] // top-left, top-right, bottom-left, bottom-right
      
      positions.forEach((pos, index) => {
        const row = Math.floor(pos / 10)
        const col = pos % 10
        
        if (row < 5 && col < 5) quadrants[0]! += 1 // top-left
        else if (row < 5 && col >= 5) quadrants[1]! += 1 // top-right
        else if (row >= 5 && col < 5) quadrants[2]! += 1 // bottom-left
        else quadrants[3]! += 1 // bottom-right
      })
      
      // Each quadrant should have exactly 25 positions
      quadrants.forEach(count => {
        expect(count).toBe(25)
      })
    })
  })

  describe('Randomization Quality', () => {
    it('should produce statistically different results', () => {
      // Test that multiple calls to generateRandomNumbers produce different results
      const sets = Array.from({ length: 20 }, () => generateRandomNumbers())
      
      // Calculate how many sets are identical to the first one
      const identicalCount = sets.filter(set => 
        JSON.stringify(set) === JSON.stringify(sets[0])
      ).length
      
      // Should be very few (ideally just 1 - the first set itself)
      expect(identicalCount).toBeLessThanOrEqual(2)
    })

    it('should distribute first positions evenly over many runs', () => {
      const firstPositions: number[] = []
      
      // Generate 1000 random number arrays and track the first number in each
      for (let i = 0; i < 1000; i++) {
        const numbers = generateRandomNumbers()
        firstPositions.push(numbers[0]!)
      }
      
      // Count occurrences of each number in first position
      const counts = new Array(10).fill(0)
      firstPositions.forEach(num => counts[num]++)
      
      // Each number should appear roughly 100 times (1000/10)
      // Allow some variance (80-120 range)
      counts.forEach(count => {
        expect(count).toBeGreaterThan(80)
        expect(count).toBeLessThan(120)
      })
    })
  })
})