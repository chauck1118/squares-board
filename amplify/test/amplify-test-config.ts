import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../data/resource';

// Test configuration for AWS Amplify
export const testConfig = {
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

// Configure Amplify for testing
export function configureAmplifyForTesting(): void {
  // Mock configuration for testing - actual config would come from Amplify outputs
  const mockConfig = {
    Auth: {
      Cognito: {
        userPoolId: testConfig.Auth.Cognito.userPoolId,
        userPoolClientId: testConfig.Auth.Cognito.userPoolClientId,
        identityPoolId: testConfig.Auth.Cognito.identityPoolId,
      },
    },
    API: {
      GraphQL: {
        endpoint: testConfig.API.GraphQL.endpoint,
        region: testConfig.API.GraphQL.region,
        defaultAuthMode: 'userPool' as const,
      },
    },
  };
  
  // Configure with proper typing
  Amplify.configure(mockConfig as any);
}

// Create a test client
export function createTestClient() {
  return generateClient<Schema>();
}

// Mock user for testing
export const mockUser = {
  userId: 'test-user-id',
  username: 'testuser@example.com',
  attributes: {
    email: 'testuser@example.com',
    'custom:displayName': 'Test User',
    'custom:isAdmin': 'false',
  },
};

// Mock admin user for testing
export const mockAdminUser = {
  userId: 'test-admin-id',
  username: 'admin@example.com',
  attributes: {
    email: 'admin@example.com',
    'custom:displayName': 'Admin User',
    'custom:isAdmin': 'true',
  },
};

// Mock board data
export const mockBoard = {
  id: 'test-board-id',
  name: 'Test March Madness Board',
  pricePerSquare: 10,
  status: 'OPEN' as const,
  totalSquares: 100,
  claimedSquares: 0,
  paidSquares: 0,
  createdBy: mockUser.userId,
  payoutStructure: {
    ROUND1: 25,
    ROUND2: 50,
    SWEET16: 100,
    ELITE8: 200,
    FINAL4: 350,
    CHAMPIONSHIP: 500,
  },
  winningTeamNumbers: null,
  losingTeamNumbers: null,
};

// Mock square data
export const mockSquare = {
  id: 'test-square-id',
  boardId: mockBoard.id,
  userId: mockUser.userId,
  gridPosition: null,
  paymentStatus: 'PENDING' as const,
  winningTeamNumber: null,
  losingTeamNumber: null,
  claimOrder: 1,
};

// Mock game data
export const mockGame = {
  id: 'test-game-id',
  boardId: mockBoard.id,
  gameNumber: 1,
  round: 'ROUND1' as const,
  team1: 'Duke',
  team2: 'UNC',
  team1Score: null,
  team2Score: null,
  status: 'SCHEDULED' as const,
  winnerSquareId: null,
  scheduledTime: new Date().toISOString(),
  completedAt: null,
};