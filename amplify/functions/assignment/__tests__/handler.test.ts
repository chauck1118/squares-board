import { handler } from '../handler';

describe('Assignment Lambda Function', () => {
  beforeEach(() => {
    // Mock Math.random for predictable tests
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Input Validation', () => {
    it('should return error for missing boardId', async () => {
      const event = {
        boardId: '',
        squares: [{ id: '1', userId: 'user1', claimOrder: 1 }],
      };

      const result = await handler(event, {} as any, {} as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input: boardId and squares are required');
    });

    it('should return error for empty squares array', async () => {
      const event = {
        boardId: 'board1',
        squares: [],
      };

      const result = await handler(event, {} as any, {} as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input: boardId and squares are required');
    });

    it('should return error for more than 100 squares', async () => {
      const squares = Array.from({ length: 101 }, (_, i) => ({
        id: `square${i}`,
        userId: `user${i}`,
        claimOrder: i + 1,
      }));

      const event = {
        boardId: 'board1',
        squares,
      };

      const result = await handler(event, {} as any, {} as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot assign more than 100 squares');
    });
  });

  describe('Assignment Logic', () => {
    it('should successfully assign squares with valid input', async () => {
      const squares = [
        { id: 'square1', userId: 'user1', claimOrder: 1 },
        { id: 'square2', userId: 'user2', claimOrder: 2 },
        { id: 'square3', userId: 'user1', claimOrder: 3 },
      ];

      const event = {
        boardId: 'board1',
        squares,
      };

      const result = await handler(event, {} as any, {} as any);

      expect(result.success).toBe(true);
      expect(result.assignments).toHaveLength(3);
      expect(result.assignments![0].squareId).toBe('square1');
      expect(result.assignments![1].squareId).toBe('square2');
      expect(result.assignments![2].squareId).toBe('square3');
    });

    it('should assign unique grid positions', async () => {
      const squares = Array.from({ length: 10 }, (_, i) => ({
        id: `square${i}`,
        userId: `user${i}`,
        claimOrder: i + 1,
      }));

      const event = {
        boardId: 'board1',
        squares,
      };

      const result = await handler(event, {} as any, {} as any);

      expect(result.success).toBe(true);
      const gridPositions = result.assignments!.map(a => a.gridPosition);
      const uniquePositions = new Set(gridPositions);
      expect(uniquePositions.size).toBe(10);
    });

    it('should assign numbers 0-9 for winning and losing team numbers', async () => {
      const squares = Array.from({ length: 100 }, (_, i) => ({
        id: `square${i}`,
        userId: `user${i}`,
        claimOrder: i + 1,
      }));

      const event = {
        boardId: 'board1',
        squares,
      };

      const result = await handler(event, {} as any, {} as any);

      expect(result.success).toBe(true);
      
      const winningNumbers = result.assignments!.map(a => a.winningTeamNumber);
      const losingNumbers = result.assignments!.map(a => a.losingTeamNumber);
      
      // Each number 0-9 should appear exactly 10 times for winning numbers
      for (let i = 0; i < 10; i++) {
        expect(winningNumbers.filter(n => n === i)).toHaveLength(10);
        expect(losingNumbers.filter(n => n === i)).toHaveLength(10);
      }
    });

    it('should sort squares by claim order before assignment', async () => {
      const squares = [
        { id: 'square3', userId: 'user3', claimOrder: 3 },
        { id: 'square1', userId: 'user1', claimOrder: 1 },
        { id: 'square2', userId: 'user2', claimOrder: 2 },
      ];

      const event = {
        boardId: 'board1',
        squares,
      };

      const result = await handler(event, {} as any, {} as any);

      expect(result.success).toBe(true);
      // First assignment should be for square with claimOrder 1
      expect(result.assignments![0].squareId).toBe('square1');
      expect(result.assignments![1].squareId).toBe('square2');
      expect(result.assignments![2].squareId).toBe('square3');
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      // Mock an error in the assignment logic
      const originalConsoleError = console.error;
      console.error = jest.fn();

      // Create an event that will cause an error
      const event = {
        boardId: 'board1',
        squares: null as any,
      };

      const result = await handler(event, {} as any, {} as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(console.error).toHaveBeenCalled();

      console.error = originalConsoleError;
    });
  });
});