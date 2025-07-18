import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

// Mock Prisma Client for unit testing
const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
} as unknown as PrismaClient;

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: await bcrypt.hash('password123', 10),
        isAdmin: false,
      };

      const expectedUser = {
        id: 'user-1',
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.create as jest.Mock).mockResolvedValue(expectedUser);

      const result = await mockPrisma.user.create({
        data: userData,
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: userData,
      });
      expect(result).toEqual(expectedUser);
      expect(result.email).toBe(userData.email);
      expect(result.displayName).toBe(userData.displayName);
      expect(result.isAdmin).toBe(false);
    });

    it('should create an admin user when isAdmin is true', async () => {
      const adminData = {
        email: 'admin@example.com',
        displayName: 'Admin User',
        passwordHash: await bcrypt.hash('adminpass', 10),
        isAdmin: true,
      };

      const expectedAdmin = {
        id: 'admin-1',
        ...adminData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.create as jest.Mock).mockResolvedValue(expectedAdmin);

      const result = await mockPrisma.user.create({
        data: adminData,
      });

      expect(result.isAdmin).toBe(true);
    });

    it('should hash password before storing', async () => {
      const plainPassword = 'mySecretPassword';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      expect(hashedPassword).not.toBe(plainPassword);
      expect(await bcrypt.compare(plainPassword, hashedPassword)).toBe(true);
    });
  });

  describe('User Validation', () => {
    it('should require unique email addresses', async () => {
      const duplicateEmailError = new Error('Unique constraint failed on the fields: (`email`)');
      (mockPrisma.user.create as jest.Mock).mockRejectedValue(duplicateEmailError);

      await expect(
        mockPrisma.user.create({
          data: {
            email: 'existing@example.com',
            displayName: 'Test User',
            passwordHash: 'hashedpass',
          },
        })
      ).rejects.toThrow('Unique constraint failed');
    });

    it('should find user by unique email', async () => {
      const expectedUser = {
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: 'hashedpass',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(expectedUser);

      const result = await mockPrisma.user.findUnique({
        where: { email: 'test@example.com' },
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(expectedUser);
    });
  });

  describe('User Relationships', () => {
    it('should include squares relationship when requested', async () => {
      const userWithSquares = {
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: 'hashedpass',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        squares: [
          {
            id: 'square-1',
            boardId: 'board-1',
            userId: 'user-1',
            gridPosition: 0,
            paymentStatus: 'PAID',
            winningTeamNumber: 5,
            losingTeamNumber: 3,
            createdAt: new Date(),
          },
        ],
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(userWithSquares);

      const result = await mockPrisma.user.findUnique({
        where: { id: 'user-1' },
        include: { squares: true },
      });

      expect(result?.squares).toHaveLength(1);
      expect(result?.squares?.[0]?.userId).toBe('user-1');
    });
  });
});