/**
 * TypeScript enums for Amplify model types
 */

export enum BoardStatus {
  OPEN = 'OPEN',
  FILLED = 'FILLED',
  ASSIGNED = 'ASSIGNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

export enum GameStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum GameRound {
  ROUND1 = 'ROUND1',
  ROUND2 = 'ROUND2',
  SWEET16 = 'SWEET16',
  ELITE8 = 'ELITE8',
  FINAL4 = 'FINAL4',
  CHAMPIONSHIP = 'CHAMPIONSHIP',
}

export interface PayoutStructure {
  round1: number;
  round2: number;
  sweet16: number;
  elite8: number;
  final4: number;
  championship: number;
}

export interface AmplifyUser {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AmplifyBoard {
  id: string;
  name: string;
  pricePerSquare: number;
  status: BoardStatus;
  totalSquares: number;
  claimedSquares: number;
  paidSquares: number;
  createdBy: string;
  payoutStructure: PayoutStructure;
  winningTeamNumbers: number[] | null;
  losingTeamNumbers: number[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface AmplifySquare {
  id: string;
  boardId: string;
  userId: string | null;
  gridPosition: number | null;
  paymentStatus: PaymentStatus;
  winningTeamNumber: number | null;
  losingTeamNumber: number | null;
  claimOrder: number;
  createdAt: string;
  updatedAt: string;
  board?: AmplifyBoard;
  user?: AmplifyUser;
}

export interface AmplifyGame {
  id: string;
  boardId: string;
  gameNumber: number;
  round: GameRound;
  team1: string;
  team2: string;
  team1Score: number | null;
  team2Score: number | null;
  status: GameStatus;
  winnerSquareId: string | null;
  scheduledTime: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  board?: AmplifyBoard;
  winnerSquare?: AmplifySquare;
}