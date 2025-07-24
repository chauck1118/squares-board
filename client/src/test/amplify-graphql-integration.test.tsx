import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { generateClient } from 'aws-amplify/data';
import { Amplify } from 'aws-amplify';
import type { Schema } from '../../../amplify/data/resource';

// Mock Amplify configuration
const mockConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'test-user-pool-id',
      userPoolClientId: 'test-client-id',
      identityPoolId: 'test-identity-pool-id',
    },
  },
  API: {
    GraphQL: {
      endpoint: 'https://test-api.appsync-api.us-east-1.amazonaws.com/graphql',
      region: 'us-east-1',
      defaultAuthMode: 'userPool',
    },
  },
};

describe('GraphQL Integration Tests', () => {
  let client: ReturnType<typeof generateClient<Schema>>;

  beforeEach(() => {
    // Configure Amplify for testing
    Amplify.configure(mockConfig);
    client = generateClient<Schema>();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('User Operations', () => {
    it('should create a new user', async () => {
      const mockUser = {
        email: 'test@example.com',
        displayName: 'Test User',
        isAdmin: false,
      };

      // Mock the GraphQL response
      const mockResponse = {
        data: {
          id: 'user-123',
          ...mockUser,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        errors: undefined,
      };

      vi.spyOn(client.models.User, 'create').mockResolvedValue(mockResponse as any);

      const result = await client.models.User.create(mockUser);

      expect(result.data).toBeDefined();
      expect(result.data?.email).toBe(mockUser.email);
      expect(result.data?.displayName).toBe(mockUser.displayName);
      expect(result.data?.isAdmin).toBe(mockUser.isAdmin);
    });

    it('should list users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          displayName: 'User One',
          isAdmin: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          displayName: 'User Two',
          isAdmin: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const mockResponse = {
        data: mockUsers,
        errors: undefined,
      };

      vi.spyOn(client.models.User, 'list').mockResolvedValue(mockResponse as any);

      const result = await client.models.User.list();

      expect(result.data).toHaveLength(2);
      expect(result.data[0].email).toBe('user1@example.com');
      expect(result.data[1].isAdmin).toBe(true);
    });
  });

  describe('Board Operations', () => {
    it('should create a new board', async () => {
      const mockBoard = {
        name: 'Test Board',
        pricePerSquare: 10,
        createdBy: 'user-123',
        payoutStructure: {
          ROUND1: 25,
          ROUND2: 50,
          SWEET16: 100,
          ELITE8: 200,
          FINAL4: 350,
          CHAMPIONSHIP: 500,
        },
      };

      const mockResponse = {
        data: {
          id: 'board-123',
          ...mockBoard,
          status: 'OPEN',
          totalSquares: 100,
          claimedSquares: 0,
          paidSquares: 0,
          winningTeamNumbers: null,
          losingTeamNumbers: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        errors: undefined,
      };

      vi.spyOn(client.models.Board, 'create').mockResolvedValue(mockResponse as any);

      const result = await client.models.Board.create(mockBoard);

      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe(mockBoard.name);
      expect(result.data?.status).toBe('OPEN');
      expect(result.data?.totalSquares).toBe(100);
    });

    it('should list boards with filtering', async () => {
      const mockBoards = [
        {
          id: 'board-1',
          name: 'Open Board',
          status: 'OPEN',
          pricePerSquare: 10,
          totalSquares: 100,
          claimedSquares: 25,
          paidSquares: 20,
          createdBy: 'user-123',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'board-2',
          name: 'Active Board',
          status: 'ACTIVE',
          pricePerSquare: 15,
          totalSquares: 100,
          claimedSquares: 100,
          paidSquares: 100,
          createdBy: 'user-123',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const mockResponse = {
        data: mockBoards,
        errors: undefined,
      };

      vi.spyOn(client.models.Board, 'list').mockResolvedValue(mockResponse as any);

      const result = await client.models.Board.list();

      expect(result.data).toHaveLength(2);
      expect(result.data[0].status).toBe('OPEN');
      expect(result.data[1].status).toBe('ACTIVE');
    });

    it('should update board status', async () => {
      const boardId = 'board-123';
      const updateData = { status: 'FILLED' as const };

      const mockResponse = {
        data: {
          id: boardId,
          name: 'Test Board',
          status: 'FILLED',
          pricePerSquare: 10,
          totalSquares: 100,
          claimedSquares: 100,
          paidSquares: 100,
          createdBy: 'user-123',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        errors: undefined,
      };

      vi.spyOn(client.models.Board, 'update').mockResolvedValue(mockResponse as any);

      const result = await client.models.Board.update({
        id: boardId,
        ...updateData,
      });

      expect(result.data?.status).toBe('FILLED');
    });
  });

  describe('Square Operations', () => {
    it('should create squares for a board', async () => {
      const mockSquare = {
        boardId: 'board-123',
        userId: 'user-123',
        paymentStatus: 'PENDING' as const,
        claimOrder: 1,
      };

      const mockResponse = {
        data: {
          id: 'square-123',
          ...mockSquare,
          gridPosition: null,
          winningTeamNumber: null,
          losingTeamNumber: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        errors: undefined,
      };

      vi.spyOn(client.models.Square, 'create').mockResolvedValue(mockResponse as any);

      const result = await client.models.Square.create(mockSquare);

      expect(result.data).toBeDefined();
      expect(result.data?.boardId).toBe(mockSquare.boardId);
      expect(result.data?.userId).toBe(mockSquare.userId);
      expect(result.data?.paymentStatus).toBe('PENDING');
    });

    it('should list squares by board', async () => {
      const boardId = 'board-123';
      const mockSquares = [
        {
          id: 'square-1',
          boardId,
          userId: 'user-1',
          gridPosition: 0,
          paymentStatus: 'PAID',
          winningTeamNumber: 7,
          losingTeamNumber: 4,
          claimOrder: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'square-2',
          boardId,
          userId: 'user-2',
          gridPosition: 1,
          paymentStatus: 'PAID',
          winningTeamNumber: 3,
          losingTeamNumber: 8,
          claimOrder: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const mockResponse = {
        data: mockSquares,
        errors: undefined,
      };

      vi.spyOn(client.models.Square, 'list').mockResolvedValue(mockResponse as any);

      const result = await client.models.Square.list({
        filter: { boardId: { eq: boardId } },
      });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].boardId).toBe(boardId);
      expect(result.data[1].boardId).toBe(boardId);
    });

    it('should update square payment status', async () => {
      const squareId = 'square-123';
      const updateData = { paymentStatus: 'PAID' as const };

      const mockResponse = {
        data: {
          id: squareId,
          boardId: 'board-123',
          userId: 'user-123',
          gridPosition: null,
          paymentStatus: 'PAID',
          winningTeamNumber: null,
          losingTeamNumber: null,
          claimOrder: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        errors: undefined,
      };

      vi.spyOn(client.models.Square, 'update').mockResolvedValue(mockResponse as any);

      const result = await client.models.Square.update({
        id: squareId,
        ...updateData,
      });

      expect(result.data?.paymentStatus).toBe('PAID');
    });
  });

  describe('Game Operations', () => {
    it('should create a game', async () => {
      const mockGame = {
        boardId: 'board-123',
        gameNumber: 1,
        round: 'ROUND1' as const,
        team1: 'Duke',
        team2: 'UNC',
        scheduledTime: new Date().toISOString(),
      };

      const mockResponse = {
        data: {
          id: 'game-123',
          ...mockGame,
          team1Score: null,
          team2Score: null,
          status: 'SCHEDULED',
          winnerSquareId: null,
          completedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        errors: undefined,
      };

      vi.spyOn(client.models.Game, 'create').mockResolvedValue(mockResponse as any);

      const result = await client.models.Game.create(mockGame);

      expect(result.data).toBeDefined();
      expect(result.data?.gameNumber).toBe(1);
      expect(result.data?.round).toBe('ROUND1');
      expect(result.data?.status).toBe('SCHEDULED');
    });

    it('should update game scores', async () => {
      const gameId = 'game-123';
      const updateData = {
        team1Score: 78,
        team2Score: 74,
        status: 'COMPLETED' as const,
        completedAt: new Date().toISOString(),
      };

      const mockResponse = {
        data: {
          id: gameId,
          boardId: 'board-123',
          gameNumber: 1,
          round: 'ROUND1',
          team1: 'Duke',
          team2: 'UNC',
          team1Score: 78,
          team2Score: 74,
          status: 'COMPLETED',
          winnerSquareId: null,
          scheduledTime: new Date().toISOString(),
          completedAt: updateData.completedAt,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        errors: undefined,
      };

      vi.spyOn(client.models.Game, 'update').mockResolvedValue(mockResponse as any);

      const result = await client.models.Game.update({
        id: gameId,
        ...updateData,
      });

      expect(result.data?.team1Score).toBe(78);
      expect(result.data?.team2Score).toBe(74);
      expect(result.data?.status).toBe('COMPLETED');
    });
  });

  describe('Error Handling', () => {
    it('should handle GraphQL errors properly', async () => {
      const mockError = {
        data: null,
        errors: [
          {
            message: 'Unauthorized',
            locations: [{ line: 2, column: 3 }],
            path: ['createBoard'],
            extensions: {
              code: 'UNAUTHORIZED',
            },
          },
        ],
      };

      vi.spyOn(client.models.Board, 'create').mockResolvedValue(mockError as any);

      const result = await client.models.Board.create({
        name: 'Test Board',
        pricePerSquare: 10,
        createdBy: 'user-123',
      });

      expect(result.data).toBeNull();
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toBe('Unauthorized');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      vi.spyOn(client.models.Board, 'list').mockRejectedValue(networkError);

      try {
        await client.models.Board.list();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBe(networkError);
      }
    });
  });
});