import { test, expect } from '@playwright/test';

test.describe('Tournament Scoring and Winner Determination E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin to manage scoring
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@example.com');
    await page.fill('[data-testid="password-input"]', 'AdminPassword123!');
    await page.click('[data-testid="login-submit"]');
  });

  test('complete game scoring workflow', async ({ page }) => {
    // Navigate to scoring section
    await page.click('[data-testid="scoring-tab"]');
    
    // Should see tournament games
    await expect(page.locator('[data-testid="games-table"]')).toBeVisible();
    
    // Update first game score
    await page.click('[data-testid="update-score-button"]:first-child');
    
    // Fill in final scores
    await page.fill('[data-testid="team1-score"]', '78');
    await page.fill('[data-testid="team2-score"]', '74');
    
    // Mark game as completed
    await page.selectOption('[data-testid="game-status"]', 'completed');
    
    // Submit score update
    await page.click('[data-testid="update-score-submit"]');
    
    // Should show success message
    await expect(page.locator('text=Score updated successfully')).toBeVisible();
    
    // Should see updated score in games table
    await expect(page.locator('[data-testid="game-score"]')).toContainText('78-74');
    
    // Should show game as completed
    await expect(page.locator('[data-testid="game-status"]')).toContainText('COMPLETED');
  });

  test('winner determination based on final score digits', async ({ page }) => {
    // Navigate to a board with assigned squares
    await page.click('[data-testid="manage-board-button"][data-status="assigned"]');
    
    // Go to scoring section
    await page.click('[data-testid="scoring-tab"]');
    
    // Update game with final score 78-74
    await page.click('[data-testid="update-score-button"]:first-child');
    await page.fill('[data-testid="team1-score"]', '78');
    await page.fill('[data-testid="team2-score"]', '74');
    await page.selectOption('[data-testid="game-status"]', 'completed');
    await page.click('[data-testid="update-score-submit"]');
    
    // Should automatically determine winner
    await expect(page.locator('[data-testid="winner-notification"]')).toBeVisible();
    
    // Winner should be square at position (8,4) - last digits 8 and 4
    await expect(page.locator('text=Winning square: Column 8, Row 4')).toBeVisible();
    
    // Should show winner details
    await expect(page.locator('[data-testid="winner-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="winner-payout"]')).toBeVisible();
  });

  test('real-time score updates and notifications', async ({ page, context }) => {
    // Open user page to watch for updates
    const userPage = await context.newPage();
    await userPage.goto('/login');
    await userPage.fill('[data-testid="email-input"]', 'testuser@example.com');
    await userPage.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await userPage.click('[data-testid="login-submit"]');
    await userPage.click('[data-testid="board-item"]:first-child');
    
    // Admin updates score
    await page.click('[data-testid="scoring-tab"]');
    await page.click('[data-testid="update-score-button"]:first-child');
    await page.fill('[data-testid="team1-score"]', '65');
    await page.fill('[data-testid="team2-score"]', '62');
    await page.click('[data-testid="update-score-submit"]');
    
    // User should see real-time score update
    await expect(userPage.locator('[data-testid="live-score"]')).toContainText('65-62');
    await expect(userPage.locator('[data-testid="score-update-notification"]')).toBeVisible();
  });

  test('payout calculation for different tournament rounds', async ({ page }) => {
    await page.click('[data-testid="manage-board-button"]:first-child');
    await page.click('[data-testid="scoring-tab"]');
    
    // Test Round 1 game (should have $25 payout)
    await page.click('[data-testid="round1-game"] [data-testid="update-score-button"]');
    await page.fill('[data-testid="team1-score"]', '81');
    await page.fill('[data-testid="team2-score"]', '73');
    await page.selectOption('[data-testid="game-status"]', 'completed');
    await page.click('[data-testid="update-score-submit"]');
    
    // Should show Round 1 payout
    await expect(page.locator('[data-testid="winner-payout"]')).toContainText('$25');
    
    // Test Sweet 16 game (should have $100 payout)
    await page.click('[data-testid="sweet16-game"] [data-testid="update-score-button"]');
    await page.fill('[data-testid="team1-score"]', '89');
    await page.fill('[data-testid="team2-score"]', '76');
    await page.selectOption('[data-testid="game-status"]', 'completed');
    await page.click('[data-testid="update-score-submit"]');
    
    // Should show Sweet 16 payout
    await expect(page.locator('[data-testid="winner-payout"]')).toContainText('$100');
    
    // Test Championship game (should have $800 payout)
    await page.click('[data-testid="championship-game"] [data-testid="update-score-button"]');
    await page.fill('[data-testid="team1-score"]', '72');
    await page.fill('[data-testid="team2-score"]', '69');
    await page.selectOption('[data-testid="game-status"]', 'completed');
    await page.click('[data-testid="update-score-submit"]');
    
    // Should show Championship payout
    await expect(page.locator('[data-testid="winner-payout"]')).toContainText('$800');
  });

  test('scoring table displays game results correctly', async ({ page, context }) => {
    // User views scoring table
    const userPage = await context.newPage();
    await userPage.goto('/login');
    await userPage.fill('[data-testid="email-input"]', 'testuser@example.com');
    await userPage.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await userPage.click('[data-testid="login-submit"]');
    await userPage.click('[data-testid="board-item"]:first-child');
    
    // Should see scoring table
    await expect(userPage.locator('[data-testid="scoring-table"]')).toBeVisible();
    
    // Admin completes multiple games
    await page.click('[data-testid="scoring-tab"]');
    
    // Complete Game 1: 78-74
    await page.click('[data-testid="game-1"] [data-testid="update-score-button"]');
    await page.fill('[data-testid="team1-score"]', '78');
    await page.fill('[data-testid="team2-score"]', '74');
    await page.selectOption('[data-testid="game-status"]', 'completed');
    await page.click('[data-testid="update-score-submit"]');
    
    // Complete Game 2: 85-71
    await page.click('[data-testid="game-2"] [data-testid="update-score-button"]');
    await page.fill('[data-testid="team1-score"]', '85');
    await page.fill('[data-testid="team2-score"]', '71');
    await page.selectOption('[data-testid="game-status"]', 'completed');
    await page.click('[data-testid="update-score-submit"]');
    
    // User should see updated scoring table
    await expect(userPage.locator('[data-testid="game-1-result"]')).toContainText('78-74 → (8,4)');
    await expect(userPage.locator('[data-testid="game-2-result"]')).toContainText('85-71 → (5,1)');
    
    // Should highlight winning squares
    await expect(userPage.locator('[data-testid="winning-square-8-4"]')).toHaveClass(/winner/);
    await expect(userPage.locator('[data-testid="winning-square-5-1"]')).toHaveClass(/winner/);
  });

  test('winner notification and display system', async ({ page, context }) => {
    // User with winning square
    const winnerPage = await context.newPage();
    await winnerPage.goto('/login');
    await winnerPage.fill('[data-testid="email-input"]', 'winner@example.com');
    await winnerPage.fill('[data-testid="password-input"]', 'WinnerPassword123!');
    await winnerPage.click('[data-testid="login-submit"]');
    await winnerPage.click('[data-testid="board-item"]:first-child');
    
    // Admin completes game that creates winner
    await page.click('[data-testid="scoring-tab"]');
    await page.click('[data-testid="update-score-button"]:first-child');
    await page.fill('[data-testid="team1-score"]', '78');
    await page.fill('[data-testid="team2-score"]', '74');
    await page.selectOption('[data-testid="game-status"]', 'completed');
    await page.click('[data-testid="update-score-submit"]');
    
    // Winner should see celebration notification
    await expect(winnerPage.locator('[data-testid="winner-celebration"]')).toBeVisible();
    await expect(winnerPage.locator('text=Congratulations! You won!')).toBeVisible();
    
    // Should show payout amount
    await expect(winnerPage.locator('[data-testid="payout-amount"]')).toBeVisible();
    
    // Should highlight winning square
    await expect(winnerPage.locator('[data-testid="user-winning-square"]')).toHaveClass(/winner-highlight/);
  });

  test('tournament progression and round tracking', async ({ page }) => {
    await page.click('[data-testid="scoring-tab"]');
    
    // Should see tournament bracket
    await expect(page.locator('[data-testid="tournament-bracket"]')).toBeVisible();
    
    // Should show current round
    await expect(page.locator('[data-testid="current-round"]')).toBeVisible();
    
    // Complete all Round 1 games
    for (let i = 1; i <= 32; i++) {
      await page.click(`[data-testid="round1-game-${i}"] [data-testid="update-score-button"]`);
      await page.fill('[data-testid="team1-score"]', '75');
      await page.fill('[data-testid="team2-score"]', '70');
      await page.selectOption('[data-testid="game-status"]', 'completed');
      await page.click('[data-testid="update-score-submit"]');
    }
    
    // Should advance to Round 2
    await expect(page.locator('[data-testid="current-round"]')).toContainText('Round 2');
    
    // Should show Round 1 completion
    await expect(page.locator('[data-testid="round1-complete"]')).toBeVisible();
  });

  test('score validation and error handling', async ({ page }) => {
    await page.click('[data-testid="scoring-tab"]');
    await page.click('[data-testid="update-score-button"]:first-child');
    
    // Try invalid scores
    await page.fill('[data-testid="team1-score"]', '-5');
    await page.fill('[data-testid="team2-score"]', '70');
    await page.click('[data-testid="update-score-submit"]');
    
    // Should show validation error
    await expect(page.locator('text=Scores must be positive numbers')).toBeVisible();
    
    // Try non-numeric scores
    await page.fill('[data-testid="team1-score"]', 'abc');
    await page.fill('[data-testid="team2-score"]', '70');
    await page.click('[data-testid="update-score-submit"]');
    
    // Should show validation error
    await expect(page.locator('text=Please enter valid numbers')).toBeVisible();
    
    // Try to complete game without scores
    await page.fill('[data-testid="team1-score"]', '');
    await page.fill('[data-testid="team2-score"]', '');
    await page.selectOption('[data-testid="game-status"]', 'completed');
    await page.click('[data-testid="update-score-submit"]');
    
    // Should show validation error
    await expect(page.locator('text=Scores required to complete game')).toBeVisible();
  });
});