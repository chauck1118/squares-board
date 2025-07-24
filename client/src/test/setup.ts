import { expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { Amplify } from 'aws-amplify';

// extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Mock Amplify configuration for testing
const mockAmplifyConfig = {
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
beforeEach(() => {
  // Reset Amplify configuration before each test
  Amplify.configure(mockAmplifyConfig);
  
  // Clear all mocks
  vi.clearAllMocks();
});

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Global test utilities for Amplify
global.testUtils = {
  mockAmplifyConfig,
  
  // Helper to create mock GraphQL responses
  createMockGraphQLResponse: (data: any, errors?: any[]) => ({
    data,
    errors,
  }),

  // Helper to create mock user
  createMockUser: (overrides = {}) => ({
    userId: 'test-user-id',
    username: 'testuser@example.com',
    attributes: {
      email: 'testuser@example.com',
      'custom:displayName': 'Test User',
      'custom:isAdmin': 'false',
    },
    ...overrides,
  }),

  // Helper to create mock board data
  createMockBoard: (overrides = {}) => ({
    id: 'test-board-id',
    name: 'Test Board',
    pricePerSquare: 10,
    status: 'OPEN',
    totalSquares: 100,
    claimedSquares: 0,
    paidSquares: 0,
    createdBy: 'test-user-id',
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  // Helper to create mock square data
  createMockSquare: (overrides = {}) => ({
    id: 'test-square-id',
    boardId: 'test-board-id',
    userId: 'test-user-id',
    gridPosition: null,
    paymentStatus: 'PENDING',
    winningTeamNumber: null,
    losingTeamNumber: null,
    claimOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  // Helper to create mock game data
  createMockGame: (overrides = {}) => ({
    id: 'test-game-id',
    boardId: 'test-board-id',
    gameNumber: 1,
    round: 'ROUND1',
    team1: 'Duke',
    team2: 'UNC',
    team1Score: null,
    team2Score: null,
    status: 'SCHEDULED',
    winnerSquareId: null,
    scheduledTime: new Date().toISOString(),
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  // Helper to wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};