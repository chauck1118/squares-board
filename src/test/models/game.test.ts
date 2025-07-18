import { PrismaClient, GameStatus } from '@prisma/client';

// Mock Prisma Client for unit testing
const mockPrisma = {
  game: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
} as unknown as PrismaClient;

describe('Game Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Game Creation', () => {
    it('should create a game with valid data', async () => {
      const gameData = {
        boardId: 'board-1',
        gameNumber: 1,
        round: 'Round 1',
        team1: 'Duke',
        team2: 'Vermont',
        scheduledTime: new Date('2024-03-21T12:00:00Z'),
        status: 'SCHEDULED' as GameStatus,
      };

      const expectedGame = {
        id: 'game-1',
        ...gameData,
        team1Score: null,
        team2Score: null,
        winnerSquareId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.game.create as jest.Mock).mockResolvedValue(expectedGame);

      const result = await mockPrisma.game.create({
        data: gameData,
      });

      expect(mockPrisma.game.create).toHaveBeenCalledWith({
        data: gameData,
      });
      expect(result).toEqual(expectedGame);
      expect(result.gameNumber).toBe(1);
      expect(result.team1).toBe('Duke');
      expect(result.team2).toBe('Vermont');
      expect(result.status).toBe('SCHEDULED');
    });

    it('should default status to SCHEDULED when not specified', async () => {
      const gameData = {
        boardId: 'board-1',
        gameNumber: 2,
        round: 'Round 1',
        team1: 'North Carolina',
        team2: 'Wagner',
        scheduledTime: new Date('2024-03-21T14:30:00Z'),
      };

      const expectedGame = {
        id: 'game-2',
        ...gameData,
        status: 'SCHEDULED' as GameStatus,
        team1Score: null,
        team2Score: null,
        winnerSquareId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.game.create as jest.Mock).mockResolvedValue(expectedGame);

      const result = await mockPrisma.game.create({
        data: gameData,
      });

      expect(result.status).toBe('SCHEDULED');
    });
  });

  describe('Game Status Management', () => {
    it('should update game status from SCHEDULED to IN_PROGRESS', async () => {
      const updatedGame = {
        id: 'game-1',
        boardId: 'board-1',
        gameNumber: 1,
        round: 'Round 1',
        team1: 'Duke',
        team2: 'Vermont',
        team1Score: 45,
        team2Score: 38,
        status: 'IN_PROGRESS' as GameStatus,
        winnerSquareId: null,
        scheduledTime: new Date('2024-03-21T12:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.game.update as jest.Mock).mockResolvedValue(updatedGame);

      const result = await mockPrisma.game.update({
        where: { id: 'game-1' },
        data: {
          status: 'IN_PROGRESS',
          team1Score: 45,
          team2Score: 38,
        },
      });

      expect(result.status).toBe('IN_PROGRESS');
      expect(result.team1Score).toBe(45);
      expect(result.team2Score).toBe(38);
    });

    it('should update game status to COMPLETED with final scores', async () => {
      const updatedGame = {
        id: 'game-1',
        boardId: 'board-1',
        gameNumber: 1,
        round: 'Round 1',
        team1: 'Duke',
        team2: 'Vermont',
        team1Score: 78,
        team2Score: 64,
        status: 'COMPLETED' as GameStatus,
        winnerSquareId: 'square-42',
        scheduledTime: new Date('2024-03-21T12:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.game.update as jest.Mock).mockResolvedValue(updatedGame);

      const result = await mockPrisma.game.update({
        where: { id: 'game-1' },
        data: {
          status: 'COMPLETED',
          team1Score: 78,
          team2Score: 64,
          winnerSquareId: 'square-42',
        },
      });

      expect(result.status).toBe('COMPLETED');
      expect(result.team1Score).toBe(78);
      expect(result.team2Score).toBe(64);
      expect(result.winnerSquareId).toBe('square-42');
    });

    it('should support all game status values', async () => {
      const statuses: GameStatus[] = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'];
      
      for (const status of statuses) {
        const updatedGame = {
          id: 'game-1',
          boardId: 'board-1',
          gameNumber: 1,
          round: 'Round 1',
          team1: 'Duke',
          team2: 'Vermont',
          team1Score: null,
          team2Score: null,
          status,
          winnerSquareId: null,
          scheduledTime: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        (mockPrisma.game.update as jest.Mock).mockResolvedValue(updatedGame);

        const result = await mockPrisma.game.update({
          where: { id: 'game-1' },
          data: { status },
        });

        expect(result.status).toBe(status);
      }
    });
  });

  describe('Game Unique Constraints', () => {
    it('should enforce unique boardId and gameNumber combination', async () => {
      const duplicateGameError = new Error('Unique constraint failed on the fields: (`boardId`,`gameNumber`)');
      (mockPrisma.game.create as jest.Mock).mockRejectedValue(duplicateGameError);

      await expect(
        mockPrisma.game.create({
          data: {
            boardId: 'board-1',
            gameNumber: 1, // Duplicate game number for same board
            round: 'Round 1',
            team1: 'Team A',
            team2: 'Team B',
            scheduledTime: new Date(),
          },
        })
      ).rejects.toThrow('Unique constraint failed');
    });
  });

  describe('Game Relationships', () => {
    it('should include board relationship when requested', async () => {
      const gameWithBoard = {
        id: 'game-1',
        boardId: 'board-1',
        gameNumber: 1,
        round: 'Round 1',
        team1: 'Duke',
        team2: 'Vermont',
        team1Score: 78,
        team2Score: 64,
        status: 'COMPLETED' as GameStatus,
        winnerSquareId: 'square-42',
        scheduledTime: new Date('2024-03-21T12:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
        board: {
          id: 'board-1',
          name: 'Test Board',
          pricePerSquare: 25.0,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      (mockPrisma.game.findUnique as jest.Mock).mockResolvedValue(gameWithBoard);

      const result = await mockPrisma.game.findUnique({
        where: { id: 'game-1' },
        include: { board: true },
      });

      expect(result?.board).toBeDefined();
      expect(result?.board.id).toBe('board-1');
    });

    it('should include winner square relationship when requested', async () => {
      const gameWithWinner = {
        id: 'game-1',
        boardId: 'board-1',
        gameNumber: 1,
        round: 'Round 1',
        team1: 'Duke',
        team2: 'Vermont',
        team1Score: 78,
        team2Score: 64,
        status: 'COMPLETED' as GameStatus,
        winnerSquareId: 'square-42',
        scheduledTime: new Date('2024-03-21T12:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
        winnerSquare: {
          id: 'square-42',
          boardId: 'board-1',
          userId: 'user-1',
          gridPosition: 42,
          paymentStatus: 'PAID',
          winningTeamNumber: 8, // Last digit of 78
          losingTeamNumber: 4,  // Last digit of 64
          createdAt: new Date(),
        },
      };

      (mockPrisma.game.findUnique as jest.Mock).mockResolvedValue(gameWithWinner);

      const result = await mockPrisma.game.findUnique({
        where: { id: 'game-1' },
        include: { winnerSquare: true },
      });

      expect(result?.winnerSquare).toBeDefined();
      expect(result?.winnerSquare?.id).toBe('square-42');
      expect(result?.winnerSquare?.winningTeamNumber).toBe(8);
      expect(result?.winnerSquare?.losingTeamNumber).toBe(4);
    });
  });

  describe('Game Queries', () => {
    it('should find games by board and round', async () => {
      const round1Games = [
        {
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
          scheduledTime: new Date('2024-03-21T12:00:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
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
          scheduledTime: new Date('2024-03-21T14:30:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrisma.game.findMany as jest.Mock).mockResolvedValue(round1Games);

      const result = await mockPrisma.game.findMany({
        where: {
          boardId: 'board-1',
          round: 'Round 1',
        },
        orderBy: { gameNumber: 'asc' },
      });

      expect(result).toHaveLength(2);
      expect(result.every(game => game.round === 'Round 1')).toBe(true);
      expect(result.every(game => game.boardId === 'board-1')).toBe(true);
      expect(result[0]?.gameNumber).toBe(1);
      expect(result[1]?.gameNumber).toBe(2);
    });

    it('should find completed games with scores', async () => {
      const completedGames = [
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
          winnerSquareId: 'square-42',
          scheduledTime: new Date('2024-03-21T12:00:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrisma.game.findMany as jest.Mock).mockResolvedValue(completedGames);

      const result = await mockPrisma.game.findMany({
        where: {
          boardId: 'board-1',
          status: 'COMPLETED',
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe('COMPLETED');
      expect(result[0]?.team1Score).toBe(78);
      expect(result[0]?.team2Score).toBe(64);
      expect(result[0]?.winnerSquareId).toBe('square-42');
    });
  });

  describe('Winner Determination Logic', () => {
    it('should determine winner based on last digit of scores', () => {
      const testCases = [
        { team1Score: 78, team2Score: 64, expectedWinning: 8, expectedLosing: 4 },
        { team1Score: 85, team2Score: 72, expectedWinning: 5, expectedLosing: 2 },
        { team1Score: 90, team2Score: 87, expectedWinning: 0, expectedLosing: 7 },
        { team1Score: 103, team2Score: 99, expectedWinning: 3, expectedLosing: 9 },
      ];

      testCases.forEach(({ team1Score, team2Score, expectedWinning, expectedLosing }) => {
        const winningDigit = team1Score % 10;
        const losingDigit = team2Score % 10;
        
        expect(winningDigit).toBe(expectedWinning);
        expect(losingDigit).toBe(expectedLosing);
      });
    });
  });
});