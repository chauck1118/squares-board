// Jest setup file for AWS Amplify testing
import { config } from 'dotenv';

// Import Jest globals
declare global {
  var testUtils: any;
}

// Load test environment variables
config({ path: '.env.test' });

// Global test setup
beforeAll(() => {
  // Setup code that runs before all tests
  console.log('Setting up AWS Amplify test environment...');
  
  // Mock AWS environment variables
  process.env.AWS_REGION = 'us-east-1';
  process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT = 'https://test-api.appsync-api.us-east-1.amazonaws.com/graphql';
  process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
  process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
});

afterAll(() => {
  // Cleanup code that runs after all tests
  console.log('Cleaning up AWS Amplify test environment...');
});

// Mock console methods in tests to reduce noise
const originalConsole = global.console;
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error, // Keep error for debugging
};

// Global test utilities
(global as any).testUtils = {
  // Helper to create mock Lambda context
  createMockContext: () => ({
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'test-function',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
    memoryLimitInMB: '128',
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/test-function',
    logStreamName: '2024/01/01/[$LATEST]test-stream',
    getRemainingTimeInMillis: () => 30000,
    done: jest.fn(),
    fail: jest.fn(),
    succeed: jest.fn(),
  }),

  // Helper to create mock Lambda callback
  createMockCallback: () => jest.fn(),

  // Helper to wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to generate test data
  generateTestBoard: (overrides = {}) => ({
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
    ...overrides,
  }),

  generateTestSquares: (count: number, boardId = 'test-board-id') => {
    return Array.from({ length: count }, (_, i) => ({
      id: `square-${i + 1}`,
      boardId,
      userId: `user-${i + 1}`,
      claimOrder: i + 1,
      paymentStatus: 'PENDING',
      gridPosition: null,
      winningTeamNumber: null,
      losingTeamNumber: null,
    }));
  },

  generateTestGame: (overrides = {}) => ({
    id: 'test-game-id',
    boardId: 'test-board-id',
    gameNumber: 1,
    round: 'ROUND1',
    team1: 'Team A',
    team2: 'Team B',
    team1Score: null,
    team2Score: null,
    status: 'SCHEDULED',
    winnerSquareId: null,
    scheduledTime: new Date().toISOString(),
    completedAt: null,
    ...overrides,
  }),
};