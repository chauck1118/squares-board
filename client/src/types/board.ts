export interface User {
  id: string;
  displayName: string;
}

export interface Square {
  id: string;
  boardId: string;
  userId: string | null;
  gridPosition: number | null;
  paymentStatus: 'PENDING' | 'PAID';
  winningTeamNumber: number | null;
  losingTeamNumber: number | null;
  createdAt: string;
  user?: User;
}

export interface PayoutStructure {
  id: string;
  boardId: string;
  round1: number;
  round2: number;
  sweet16: number;
  elite8: number;
  final4: number;
  championship: number;
}

export interface Game {
  id: string;
  boardId: string;
  gameNumber: number;
  round: string;
  team1: string;
  team2: string;
  team1Score: number | null;
  team2Score: number | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  winnerSquareId: string | null;
  scheduledTime: string;
  createdAt: string;
  updatedAt: string;
  winnerSquare?: {
    id: string;
    gridPosition: number | null;
    winningTeamNumber: number | null;
    losingTeamNumber: number | null;
    user?: {
      id: string;
      displayName: string;
    } | null;
  };
  payout?: number;
}

export interface BoardSummary {
  id: string;
  name: string;
  pricePerSquare: number;
  status: 'OPEN' | 'FILLED' | 'ASSIGNED' | 'ACTIVE' | 'COMPLETED';
  totalSquares: number;
  claimedSquares: number;
  paidSquares: number;
  createdAt: string;
  updatedAt: string;
}

export interface BoardDetail extends BoardSummary {
  squares: Square[];
  payoutStructure: PayoutStructure | null;
  games: Game[];
}

export interface BoardListResponse {
  boards: BoardSummary[];
}

export interface BoardDetailResponse {
  board: BoardDetail;
}

export interface ClaimSquaresRequest {
  numberOfSquares: number;
}

export interface ClaimSquaresResponse {
  message: string;
  squares: Square[];
  totalUserSquares: number;
}

export interface ScoringTableResponse {
  board: {
    id: string;
    name: string;
    status: string;
  };
  scoringTable: {
    games: Game[];
  };
}

// Admin types
export interface CreateBoardRequest {
  name: string;
  pricePerSquare: number;
  payoutStructure: {
    round1: number;
    round2: number;
    sweet16: number;
    elite8: number;
    final4: number;
    championship: number;
  };
}

export interface CreateBoardResponse {
  message: string;
  board: BoardSummary;
}

export interface UpdateSquarePaymentResponse {
  message: string;
  square: {
    id: string;
    boardId: string;
    boardName: string;
    userId: string | null;
    user: User | null;
    paymentStatus: 'PENDING' | 'PAID';
    gridPosition: number | null;
    createdAt: string;
  };
}

export interface BoardPaymentStatusResponse {
  board: {
    id: string;
    name: string;
    status: string;
    pricePerSquare: number;
  };
  paymentStats: {
    totalSquares: number;
    paidSquares: number;
    pendingSquares: number;
  };
  squaresByUser: Array<{
    user: User;
    squares: Array<{
      id: string;
      paymentStatus: 'PENDING' | 'PAID';
      gridPosition: number | null;
      createdAt: string;
    }>;
    paidCount: number;
    pendingCount: number;
  }>;
}

export interface BoardAssignmentResponse {
  message: string;
  assignedSquares: number;
  winningNumbers: number[];
  losingNumbers: number[];
}

export interface BoardAssignmentValidationResponse {
  valid: boolean;
  errors: string[];
  stats: {
    totalSquares: number;
    assignedSquares: number;
    duplicatePositions: number;
    invalidPositions: number;
  };
}

export interface CreateGameRequest {
  gameNumber: number;
  round: string;
  team1: string;
  team2: string;
  scheduledTime: string;
}

export interface CreateGameResponse {
  message: string;
  game: Game;
}

export interface UpdateGameScoreRequest {
  team1Score: number;
  team2Score: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface UpdateGameScoreResponse {
  message: string;
  game: Game;
  winner?: {
    square: {
      id: string;
      gridPosition: number | null;
      winningTeamNumber: number | null;
      losingTeamNumber: number | null;
    };
    user: User | null;
    payout: number;
  } | null;
}

export interface BoardGamesResponse {
  board: {
    id: string;
    name: string;
    status: string;
  };
  games: Game[];
}

export interface AdminScoringTableResponse {
  board: {
    id: string;
    name: string;
    status: string;
  };
  scoringTable: {
    games: Game[];
  };
}