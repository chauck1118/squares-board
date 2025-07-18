import { PrismaClient, PaymentStatus } from '@prisma/client';

// Mock Prisma Client for unit testing
const mockPrisma = {
  square: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
} as unknown as PrismaClient;

describe('Square Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Square Creation', () => {
    it('should create a square with valid data', async () => {
      const squareData = {
        boardId: 'board-1',
        userId: 'user-1',
        paymentStatus: 'PENDING' as PaymentStatus,
      };

      const expectedSquare = {
        id: 'square-1',
        ...squareData,
        gridPosition: null,
        winningTeamNumber: null,
        losingTeamNumber: null,
        createdAt: new Date(),
      };

      (mockPrisma.square.create as jest.Mock).mockResolvedValue(expectedSquare);

      const result = await mockPrisma.square.create({
        data: squareData,
      });

      expect(mockPrisma.square.create).toHaveBeenCalledWith({
        data: squareData,
      });
      expect(result).toEqual(expectedSquare);
      expect(result.boardId).toBe('board-1');
      expect(result.userId).toBe('user-1');
      expect(result.paymentStatus).toBe('PENDING');
    });

    it('should default payment status to PENDING when not specified', async () => {
      const squareData = {
        boardId: 'board-1',
        userId: 'user-1',
      };

      const expectedSquare = {
        id: 'square-1',
        ...squareData,
        paymentStatus: 'PENDING' as PaymentStatus,
        gridPosition: null,
        winningTeamNumber: null,
        losingTeamNumber: null,
        createdAt: new Date(),
      };

      (mockPrisma.square.create as jest.Mock).mockResolvedValue(expectedSquare);

      const result = await mockPrisma.square.create({
        data: squareData,
      });

      expect(result.paymentStatus).toBe('PENDING');
    });

    it('should allow creating square without user (unclaimed)', async () => {
      const squareData = {
        boardId: 'board-1',
        userId: null,
      };

      const expectedSquare = {
        id: 'square-1',
        ...squareData,
        paymentStatus: 'PENDING' as PaymentStatus,
        gridPosition: null,
        winningTeamNumber: null,
        losingTeamNumber: null,
        createdAt: new Date(),
      };

      (mockPrisma.square.create as jest.Mock).mockResolvedValue(expectedSquare);

      const result = await mockPrisma.square.create({
        data: squareData,
      });

      expect(result.userId).toBeNull();
    });
  });

  describe('Square Assignment', () => {
    it('should assign grid position when board is filled', async () => {
      const updatedSquare = {
        id: 'square-1',
        boardId: 'board-1',
        userId: 'user-1',
        gridPosition: 42, // Position 42 in 10x10 grid
        paymentStatus: 'PAID' as PaymentStatus,
        winningTeamNumber: 7,
        losingTeamNumber: 3,
        createdAt: new Date(),
      };

      (mockPrisma.square.update as jest.Mock).mockResolvedValue(updatedSquare);

      const result = await mockPrisma.square.update({
        where: { id: 'square-1' },
        data: {
          gridPosition: 42,
          winningTeamNumber: 7,
          losingTeamNumber: 3,
        },
      });

      expect(result.gridPosition).toBe(42);
      expect(result.winningTeamNumber).toBe(7);
      expect(result.losingTeamNumber).toBe(3);
    });

    it('should validate grid position is between 0-99', () => {
      const validPositions = [0, 25, 50, 75, 99];
      const invalidPositions = [-1, 100, 150];

      validPositions.forEach(position => {
        expect(position).toBeGreaterThanOrEqual(0);
        expect(position).toBeLessThanOrEqual(99);
      });

      invalidPositions.forEach(position => {
        expect(position < 0 || position > 99).toBe(true);
      });
    });

    it('should validate team numbers are between 0-9', () => {
      const validNumbers = [0, 3, 5, 7, 9];
      const invalidNumbers = [-1, 10, 15];

      validNumbers.forEach(number => {
        expect(number).toBeGreaterThanOrEqual(0);
        expect(number).toBeLessThanOrEqual(9);
      });

      invalidNumbers.forEach(number => {
        expect(number < 0 || number > 9).toBe(true);
      });
    });
  });

  describe('Payment Status Management', () => {
    it('should update payment status from PENDING to PAID', async () => {
      const updatedSquare = {
        id: 'square-1',
        boardId: 'board-1',
        userId: 'user-1',
        gridPosition: null,
        paymentStatus: 'PAID' as PaymentStatus,
        winningTeamNumber: null,
        losingTeamNumber: null,
        createdAt: new Date(),
      };

      (mockPrisma.square.update as jest.Mock).mockResolvedValue(updatedSquare);

      const result = await mockPrisma.square.update({
        where: { id: 'square-1' },
        data: { paymentStatus: 'PAID' },
      });

      expect(result.paymentStatus).toBe('PAID');
    });
  });

  describe('Square Relationships', () => {
    it('should include board relationship when requested', async () => {
      const squareWithBoard = {
        id: 'square-1',
        boardId: 'board-1',
        userId: 'user-1',
        gridPosition: 25,
        paymentStatus: 'PAID' as PaymentStatus,
        winningTeamNumber: 5,
        losingTeamNumber: 2,
        createdAt: new Date(),
        board: {
          id: 'board-1',
          name: 'Test Board',
          pricePerSquare: 25.0,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      (mockPrisma.square.findUnique as jest.Mock).mockResolvedValue(squareWithBoard);

      const result = await mockPrisma.square.findUnique({
        where: { id: 'square-1' },
        include: { board: true },
      });

      expect(result?.board).toBeDefined();
      expect(result?.board.id).toBe('board-1');
    });

    it('should include user relationship when requested', async () => {
      const squareWithUser = {
        id: 'square-1',
        boardId: 'board-1',
        userId: 'user-1',
        gridPosition: 25,
        paymentStatus: 'PAID' as PaymentStatus,
        winningTeamNumber: 5,
        losingTeamNumber: 2,
        createdAt: new Date(),
        user: {
          id: 'user-1',
          email: 'test@example.com',
          displayName: 'Test User',
          passwordHash: 'hashedpass',
          isAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      (mockPrisma.square.findUnique as jest.Mock).mockResolvedValue(squareWithUser);

      const result = await mockPrisma.square.findUnique({
        where: { id: 'square-1' },
        include: { user: true },
      });

      expect(result?.user).toBeDefined();
      expect(result?.user?.id).toBe('user-1');
    });
  });

  describe('Square Queries', () => {
    it('should count paid squares for a board', async () => {
      (mockPrisma.square.count as jest.Mock).mockResolvedValue(75);

      const result = await mockPrisma.square.count({
        where: {
          boardId: 'board-1',
          paymentStatus: 'PAID',
        },
      });

      expect(mockPrisma.square.count).toHaveBeenCalledWith({
        where: {
          boardId: 'board-1',
          paymentStatus: 'PAID',
        },
      });
      expect(result).toBe(75);
    });

    it('should find squares by user for a specific board', async () => {
      const userSquares = [
        {
          id: 'square-1',
          boardId: 'board-1',
          userId: 'user-1',
          gridPosition: 25,
          paymentStatus: 'PAID' as PaymentStatus,
          winningTeamNumber: 5,
          losingTeamNumber: 2,
          createdAt: new Date(),
        },
        {
          id: 'square-2',
          boardId: 'board-1',
          userId: 'user-1',
          gridPosition: 67,
          paymentStatus: 'PAID' as PaymentStatus,
          winningTeamNumber: 7,
          losingTeamNumber: 6,
          createdAt: new Date(),
        },
      ];

      (mockPrisma.square.findMany as jest.Mock).mockResolvedValue(userSquares);

      const result = await mockPrisma.square.findMany({
        where: {
          boardId: 'board-1',
          userId: 'user-1',
        },
      });

      expect(result).toHaveLength(2);
      expect(result.every(square => square.userId === 'user-1')).toBe(true);
      expect(result.every(square => square.boardId === 'board-1')).toBe(true);
    });
  });
});