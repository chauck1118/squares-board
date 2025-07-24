import { handler } from '../handler';

describe('Scoring Lambda Function', () => {
  const mockSquares = [
    { id: 'square1', userId: 'user1', winningTeamNumber: 7, losingTeamNumber: 4 },
    { id: 'square2', userId: 'user2', winningTeamNumber: 3, losingTeamNumber: 8 },
    { id: 'square3', userId: 'user3', winningTeamNumber: 0, losingTeamNumber: 0 },
  ];

  describe('Input Validation', () => {
    it('should return error for missing gameId', async () => {
      const event = {
        gameId: '',
        boardId: 'board1',
        team1Score: 78,
        team2Score: 74,
        round: 'ROUND1' as const,
        squares: mockSquares,
      };

      const result = await handler(event, {} as any, {} as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input: gameId, boardId, and scores are required');
    });

    it('should return error for missing boardId', async () => {
      const event = {
        gameId: 'game1',
        boardId: '',
        team1Score: 78,
        team2Score: 74,
        round: 'ROUND1' as const,
        squares: mockSquares,
      };

      const result = await handler(event, {} as any, {} as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input: gameId, boardId, and scores are required');
    });

    it('should return error for negative scores', async () => {
      const event = {
        gameId: 'game1',
        boardId: 'board1',
        team1Score: -5,
        team2Score: 74,
        round: 'ROUND1' as const,
        squares: mockSquares,
      };

      const result = await handler(event, {} as any, {} as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Scores cannot be negative');
    });

    it('should return error for empty squares array', async () => {
      const event = {
        gameId: 'game1',
        boardId: 'board1',
        team1Score: 78,
        team2Score: 74,
        round: 'ROUND1' as const,
        squares: [],
      };

      const result = await handler(event, {} as any, {} as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No squares provided for scoring');
    });
  });

  describe('Winner Determination', () => {
    it('should find correct winner based on score last digits', async () => {
      const event = {
        gameId: 'game1',
        boardId: 'board1',
        team1Score: 78, // last digit 8
        team2Score: 74, // last digit 4
        round: 'ROUND1' as const,
        squares: [
          { id: 'square1', userId: 'user1', winningTeamNumber: 7, losingTeamNumber: 4 },
          { id: 'square2', userId: 'user2', winningTeamNumber: 8, losingTeamNumber: 4 }, // Winner
          { id: 'square3', userId: 'user3', winningTeamNumber: 0, losingTeamNumber: 0 },
        ],
      };

      const result = await handler(event, {} as any, {} as any);

      expect(result.success).toBe(true);
      expect(result.winnerSquareId).toBe('square2');
      expect(result.winnerUserId).toBe('user2');
      expect(result.winningNumbers).toEqual({ team1LastDigit: 8, team2LastDigit: 4 });
    });

    it('should handle case with no winner', async () => {
      const event = {
        gameId: 'game1',
        boardId: 'board1',
        team1Score: 78, // last digit 8
        team2Score: 75, // last digit 5
        round: 'ROUND1' as const,
        squares: [
          { id: 'square1', userId: 'user1', winningTeamNumber: 7, losingTeamNumber: 4 },
          { id: 'square2', userId: 'user2', winningTeamNumber: 3, losingTeamNumber: 8 },
          { id: 'square3', userId: 'user3', winningTeamNumber: 0, losingTeamNumber: 0 },
        ],
      };

      const result = await handler(event, {} as any, {} as any);

      expect(result.success).toBe(true);
      expect(result.winnerSquareId).toBeUndefined();
      expect(result.winnerUserId).toBeUndefined();
      expect(result.winningNumbers).toEqual({ team1LastDigit: 8, team2LastDigit: 5 });
    });

    it('should handle zero scores correctly', async () => {
      const event = {
        gameId: 'game1',
        boardId: 'board1',
        team1Score: 10, // last digit 0
        team2Score: 20, // last digit 0
        round: 'ROUND1' as const,
        squares: [
          { id: 'square1', userId: 'user1', winningTeamNumber: 7, losingTeamNumber: 4 },
          { id: 'square2', userId: 'user2', winningTeamNumber: 3, losingTeamNumber: 8 },
          { id: 'square3', userId: 'user3', winningTeamNumber: 0, losingTeamNumber: 0 }, // Winner
        ],
      };

      const result = await handler(event, {} as any, {} as any);

      expect(result.success).toBe(true);
      expect(result.winnerSquareId).toBe('square3');
      expect(result.winnerUserId).toBe('user3');
      expect(result.winningNumbers).toEqual({ team1LastDigit: 0, team2LastDigit: 0 });
    });
  });

  describe('Payout Calculation', () => {
    const testCases = [
      { round: 'ROUND1' as const, expectedPayout: 25 },
      { round: 'ROUND2' as const, expectedPayout: 50 },
      { round: 'SWEET16' as const, expectedPayout: 100 },
      { round: 'ELITE8' as const, expectedPayout: 200 },
      { round: 'FINAL4' as const, expectedPayout: 350 },
      { round: 'CHAMPIONSHIP' as const, expectedPayout: 500 },
    ];

    testCases.forEach(({ round, expectedPayout }) => {
      it(`should calculate correct payout for ${round}`, async () => {
        const event = {
          gameId: 'game1',
          boardId: 'board1',
          team1Score: 78,
          team2Score: 74,
          round,
          squares: [
            { id: 'square1', userId: 'user1', winningTeamNumber: 8, losingTeamNumber: 4 },
          ],
        };

        const result = await handler(event, {} as any, {} as any);

        expect(result.success).toBe(true);
        expect(result.payout).toBe(expectedPayout);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      const originalConsoleError = console.error;
      console.error = jest.fn();

      // Create an event that will cause an error
      const event = {
        gameId: 'game1',
        boardId: 'board1',
        team1Score: 78,
        team2Score: 74,
        round: 'ROUND1' as const,
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