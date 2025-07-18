import { Page } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  displayName: string;
  isAdmin?: boolean;
}

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    displayName: 'Admin User',
    isAdmin: true
  },
  user1: {
    email: 'testuser@example.com',
    password: 'SecurePassword123!',
    displayName: 'Test User'
  },
  user2: {
    email: 'mobile@example.com',
    password: 'MobilePassword123!',
    displayName: 'Mobile User'
  },
  user3: {
    email: 'journey@example.com',
    password: 'JourneyPassword123!',
    displayName: 'Journey User'
  },
  winner: {
    email: 'winner@example.com',
    password: 'WinnerPassword123!',
    displayName: 'Winner User'
  }
};

export interface TestBoard {
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

export const TEST_BOARDS: Record<string, TestBoard> = {
  standard: {
    name: 'March Madness 2024',
    pricePerSquare: 25,
    payoutStructure: {
      round1: 25,
      round2: 50,
      sweet16: 100,
      elite8: 200,
      final4: 400,
      championship: 800
    }
  },
  small: {
    name: 'Test Board Small',
    pricePerSquare: 10,
    payoutStructure: {
      round1: 10,
      round2: 20,
      sweet16: 40,
      elite8: 80,
      final4: 160,
      championship: 320
    }
  }
};

export interface GameScore {
  team1Score: number;
  team2Score: number;
  round: string;
}

export const TEST_GAME_SCORES: GameScore[] = [
  { team1Score: 78, team2Score: 74, round: 'Round 1' },
  { team1Score: 85, team2Score: 71, round: 'Round 1' },
  { team1Score: 92, team2Score: 88, round: 'Round 1' },
  { team1Score: 67, team2Score: 63, round: 'Round 2' },
  { team1Score: 81, team2Score: 79, round: 'Round 2' },
  { team1Score: 89, team2Score: 76, round: 'Sweet 16' },
  { team1Score: 72, team2Score: 69, round: 'Championship' }
];

export class TestHelpers {
  static async loginUser(page: Page, user: TestUser): Promise<void> {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', user.email);
    await page.fill('[data-testid="password-input"]', user.password);
    await page.click('[data-testid="login-submit"]');
    
    if (user.isAdmin) {
      await page.waitForURL('/admin');
    } else {
      await page.waitForURL('/dashboard');
    }
  }

  static async registerUser(page: Page, user: TestUser): Promise<void> {
    await page.goto('/register');
    await page.fill('[data-testid="display-name-input"]', user.displayName);
    await page.fill('[data-testid="email-input"]', user.email);
    await page.fill('[data-testid="password-input"]', user.password);
    await page.click('[data-testid="register-submit"]');
    await page.waitForURL('/login');
  }

  static async createBoard(page: Page, board: TestBoard): Promise<void> {
    await page.click('[data-testid="create-board-button"]');
    await page.fill('[data-testid="board-name-input"]', board.name);
    await page.fill('[data-testid="price-per-square-input"]', board.pricePerSquare.toString());
    
    // Set payout structure
    await page.fill('[data-testid="round1-payout"]', board.payoutStructure.round1.toString());
    await page.fill('[data-testid="round2-payout"]', board.payoutStructure.round2.toString());
    await page.fill('[data-testid="sweet16-payout"]', board.payoutStructure.sweet16.toString());
    await page.fill('[data-testid="elite8-payout"]', board.payoutStructure.elite8.toString());
    await page.fill('[data-testid="final4-payout"]', board.payoutStructure.final4.toString());
    await page.fill('[data-testid="championship-payout"]', board.payoutStructure.championship.toString());
    
    await page.click('[data-testid="create-board-submit"]');
  }

  static async claimSquares(page: Page, count: number): Promise<void> {
    await page.click('[data-testid="claim-squares-button"]');
    await page.selectOption('[data-testid="squares-count-select"]', count.toString());
    await page.click('[data-testid="confirm-claim-button"]');
  }

  static async markSquareAsPaid(page: Page, userEmail: string): Promise<void> {
    const squareSelector = `[data-testid="pending-square"][data-user="${userEmail}"] [data-testid="mark-paid-button"]`;
    await page.click(squareSelector);
    await page.click('[data-testid="confirm-payment-button"]');
  }

  static async updateGameScore(page: Page, gameIndex: number, score: GameScore): Promise<void> {
    const gameSelector = `[data-testid="update-score-button"]:nth-child(${gameIndex + 1})`;
    await page.click(gameSelector);
    await page.fill('[data-testid="team1-score"]', score.team1Score.toString());
    await page.fill('[data-testid="team2-score"]', score.team2Score.toString());
    await page.selectOption('[data-testid="game-status"]', 'completed');
    await page.click('[data-testid="update-score-submit"]');
  }

  static async waitForNotification(page: Page, message: string): Promise<void> {
    await page.waitForSelector(`text=${message}`, { timeout: 5000 });
  }

  static async waitForRealTimeUpdate(page: Page, selector: string, expectedText: string): Promise<void> {
    await page.waitForFunction(
      ({ selector, expectedText }) => {
        const element = document.querySelector(selector);
        return element && element.textContent?.includes(expectedText);
      },
      { selector, expectedText },
      { timeout: 10000 }
    );
  }

  static generateRandomScore(): { team1Score: number; team2Score: number } {
    return {
      team1Score: Math.floor(Math.random() * 40) + 60, // 60-99
      team2Score: Math.floor(Math.random() * 40) + 60  // 60-99
    };
  }

  static getWinningSquarePosition(team1Score: number, team2Score: number): string {
    const lastDigit1 = team1Score % 10;
    const lastDigit2 = team2Score % 10;
    return `${lastDigit1}${lastDigit2}`;
  }

  static async simulateSlowNetwork(page: Page, delayMs: number = 2000): Promise<void> {
    await page.route('**/api/**', route => {
      setTimeout(() => route.continue(), delayMs);
    });
  }

  static async restoreNetwork(page: Page): Promise<void> {
    await page.unroute('**/api/**');
  }

  static async simulateNetworkError(page: Page, endpoint: string): Promise<void> {
    await page.route(`**/api/${endpoint}`, route => route.abort());
  }
}