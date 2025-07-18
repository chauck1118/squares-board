import { test, expect } from '@playwright/test';

test.describe('Complete User Journey E2E', () => {
  test('full application workflow from registration to winning', async ({ page, context }) => {
    // Step 1: User Registration
    await page.goto('/');
    await page.click('text=Register');
    
    await page.fill('[data-testid="display-name-input"]', 'Journey User');
    await page.fill('[data-testid="email-input"]', 'journey@example.com');
    await page.fill('[data-testid="password-input"]', 'JourneyPassword123!');
    await page.click('[data-testid="register-submit"]');
    
    await expect(page).toHaveURL('/login');
    await expect(page.locator('text=Registration successful')).toBeVisible();
    
    // Step 2: User Login
    await page.fill('[data-testid="email-input"]', 'journey@example.com');
    await page.fill('[data-testid="password-input"]', 'JourneyPassword123!');
    await page.click('[data-testid="login-submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome, Journey User')).toBeVisible();
    
    // Step 3: Browse Available Boards
    await expect(page.locator('[data-testid="boards-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="board-item"]')).toHaveCount.greaterThan(0);
    
    // Step 4: Select and View Board Details
    await page.click('[data-testid="board-item"]:first-child');
    await expect(page.locator('[data-testid="board-detail"]')).toBeVisible();
    await expect(page.locator('[data-testid="squares-grid"]')).toBeVisible();
    
    // Step 5: Claim Squares
    await page.click('[data-testid="claim-squares-button"]');
    await page.selectOption('[data-testid="squares-count-select"]', '7');
    await page.click('[data-testid="confirm-claim-button"]');
    
    await expect(page.locator('text=Successfully claimed 7 squares')).toBeVisible();
    await expect(page.locator('text=Payment Pending')).toBeVisible();
    
    // Step 6: Admin Processes Payment (separate context)
    const adminPage = await context.newPage();
    await adminPage.goto('/login');
    await adminPage.fill('[data-testid="email-input"]', 'admin@example.com');
    await adminPage.fill('[data-testid="password-input"]', 'AdminPassword123!');
    await adminPage.click('[data-testid="login-submit"]');
    
    await adminPage.click('[data-testid="manage-board-button"]:first-child');
    
    // Find user's squares and mark as paid
    const userSquares = adminPage.locator('[data-testid="pending-square"][data-user="journey@example.com"]');
    const squareCount = await userSquares.count();
    
    for (let i = 0; i < squareCount; i++) {
      await adminPage.click(`[data-testid="pending-square"][data-user="journey@example.com"]:nth-child(${i + 1}) [data-testid="mark-paid-button"]`);
      await adminPage.click('[data-testid="confirm-payment-button"]');
    }
    
    // Step 7: User Sees Payment Confirmation
    await expect(page.locator('text=Payment confirmed')).toBeVisible();
    await expect(page.locator('[data-testid="payment-status"]')).toContainText('PAID');
    
    // Step 8: Board Fills Up and Assignment Occurs
    // Simulate board filling up (in real scenario, other users would claim squares)
    await adminPage.click('[data-testid="simulate-board-fill-button"]');
    
    // Trigger assignment
    await adminPage.click('[data-testid="manual-assignment-button"]');
    await adminPage.click('[data-testid="confirm-assignment-button"]');
    
    await expect(adminPage.locator('text=Squares assigned successfully')).toBeVisible();
    
    // Step 9: User Sees Square Assignment
    await expect(page.locator('[data-testid="assignment-notification"]')).toBeVisible();
    await expect(page.locator('text=Your squares have been assigned')).toBeVisible();
    
    // User should see their assigned positions
    await expect(page.locator('[data-testid="user-assigned-squares"]')).toHaveCount(7);
    
    // Step 10: Tournament Begins - Admin Updates Scores
    await adminPage.click('[data-testid="scoring-tab"]');
    
    // Update first game score
    await adminPage.click('[data-testid="update-score-button"]:first-child');
    await adminPage.fill('[data-testid="team1-score"]', '78');
    await adminPage.fill('[data-testid="team2-score"]', '74');
    await adminPage.selectOption('[data-testid="game-status"]', 'completed');
    await adminPage.click('[data-testid="update-score-submit"]');
    
    // Step 11: User Sees Live Score Updates
    await expect(page.locator('[data-testid="live-score"]')).toContainText('78-74');
    await expect(page.locator('[data-testid="score-update-notification"]')).toBeVisible();
    
    // Step 12: Check if User Won (if they have square 8,4)
    const userWinningSquare = page.locator('[data-testid="user-square"][data-position="84"]');
    const hasWinningSquare = await userWinningSquare.count() > 0;
    
    if (hasWinningSquare) {
      // User won!
      await expect(page.locator('[data-testid="winner-celebration"]')).toBeVisible();
      await expect(page.locator('text=Congratulations! You won!')).toBeVisible();
      await expect(page.locator('[data-testid="payout-amount"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-winning-square"]')).toHaveClass(/winner-highlight/);
    } else {
      // User didn't win this round
      await expect(page.locator('[data-testid="game-result"]')).toContainText('78-74');
      await expect(page.locator('[data-testid="winning-square-8-4"]')).toHaveClass(/winner/);
    }
    
    // Step 13: Continue Tournament - Multiple Games
    for (let gameNum = 2; gameNum <= 5; gameNum++) {
      await adminPage.click(`[data-testid="game-${gameNum}"] [data-testid="update-score-button"]`);
      
      // Generate random scores
      const team1Score = Math.floor(Math.random() * 40) + 60; // 60-99
      const team2Score = Math.floor(Math.random() * 40) + 60; // 60-99
      
      await adminPage.fill('[data-testid="team1-score"]', team1Score.toString());
      await adminPage.fill('[data-testid="team2-score"]', team2Score.toString());
      await adminPage.selectOption('[data-testid="game-status"]', 'completed');
      await adminPage.click('[data-testid="update-score-submit"]');
      
      // User should see each update
      await expect(page.locator(`[data-testid="game-${gameNum}-result"]`)).toContainText(`${team1Score}-${team2Score}`);
    }
    
    // Step 14: View Complete Scoring Table
    await expect(page.locator('[data-testid="scoring-table"]')).toBeVisible();
    
    // Should show all completed games
    await expect(page.locator('[data-testid="completed-game"]')).toHaveCount(5);
    
    // Should show user's total winnings (if any)
    const totalWinnings = page.locator('[data-testid="total-winnings"]');
    await expect(totalWinnings).toBeVisible();
    
    // Step 15: User Views Their Complete Board History
    await page.click('[data-testid="my-boards-tab"]');
    
    // Should see participated boards
    await expect(page.locator('[data-testid="participated-board"]')).toHaveCount.greaterThan(0);
    
    // Should show square count and status for each board
    await expect(page.locator('[data-testid="board-square-count"]')).toContainText('7 squares');
    await expect(page.locator('[data-testid="board-payment-status"]')).toContainText('PAID');
    
    // Step 16: User Logs Out
    await page.click('[data-testid="logout-button"]');
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Login')).toBeVisible();
    
    // Step 17: Verify Session Cleanup
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login'); // Should redirect to login
    
    // Step 18: Admin Views Final Board Statistics
    await adminPage.click('[data-testid="analytics-tab"]');
    
    // Should see participation metrics
    await expect(adminPage.locator('[data-testid="total-participants"]')).toBeVisible();
    await expect(adminPage.locator('[data-testid="total-revenue"]')).toBeVisible();
    await expect(adminPage.locator('[data-testid="completion-rate"]')).toBeVisible();
    
    // Should see winner distribution
    await expect(adminPage.locator('[data-testid="winner-distribution"]')).toBeVisible();
    
    console.log('✅ Complete user journey test passed successfully!');
  });

  test('error recovery and edge cases in user journey', async ({ page, context }) => {
    // Test network interruption during square claiming
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'journey@example.com');
    await page.fill('[data-testid="password-input"]', 'JourneyPassword123!');
    await page.click('[data-testid="login-submit"]');
    
    await page.click('[data-testid="board-item"]:first-child');
    await page.click('[data-testid="claim-squares-button"]');
    await page.selectOption('[data-testid="squares-count-select"]', '5');
    
    // Simulate network failure
    await page.route('**/api/boards/*/claim', route => route.abort());
    
    await page.click('[data-testid="confirm-claim-button"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    await expect(page.locator('text=Network error. Please try again.')).toBeVisible();
    
    // Should show retry button
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Restore network and retry
    await page.unroute('**/api/boards/*/claim');
    await page.click('[data-testid="retry-button"]');
    
    // Should succeed on retry
    await expect(page.locator('text=Successfully claimed 5 squares')).toBeVisible();
  });

  test('concurrent user interactions and race conditions', async ({ context }) => {
    // Create multiple user contexts
    const user1Page = await context.newPage();
    const user2Page = await context.newPage();
    const adminPage = await context.newPage();
    
    // All users try to claim the last available squares simultaneously
    const users = [
      { page: user1Page, email: 'user1@example.com', name: 'User One' },
      { page: user2Page, email: 'user2@example.com', name: 'User Two' }
    ];
    
    // Login all users
    for (const user of users) {
      await user.page.goto('/register');
      await user.page.fill('[data-testid="display-name-input"]', user.name);
      await user.page.fill('[data-testid="email-input"]', user.email);
      await user.page.fill('[data-testid="password-input"]', 'Password123!');
      await user.page.click('[data-testid="register-submit"]');
      
      await user.page.goto('/login');
      await user.page.fill('[data-testid="email-input"]', user.email);
      await user.page.fill('[data-testid="password-input"]', 'Password123!');
      await user.page.click('[data-testid="login-submit"]');
    }
    
    // Admin creates a small board (10 squares for testing)
    await adminPage.goto('/login');
    await adminPage.fill('[data-testid="email-input"]', 'admin@example.com');
    await adminPage.fill('[data-testid="password-input"]', 'AdminPassword123!');
    await adminPage.click('[data-testid="login-submit"]');
    
    await adminPage.click('[data-testid="create-board-button"]');
    await adminPage.fill('[data-testid="board-name-input"]', 'Race Condition Test');
    await adminPage.fill('[data-testid="max-squares-input"]', '10');
    await adminPage.click('[data-testid="create-board-submit"]');
    
    // Both users try to claim the last 6 squares (should only allow one)
    await Promise.all([
      user1Page.click('[data-testid="board-item"]:last-child'),
      user2Page.click('[data-testid="board-item"]:last-child')
    ]);
    
    await Promise.all([
      user1Page.click('[data-testid="claim-squares-button"]'),
      user2Page.click('[data-testid="claim-squares-button"]')
    ]);
    
    await Promise.all([
      user1Page.selectOption('[data-testid="squares-count-select"]', '6'),
      user2Page.selectOption('[data-testid="squares-count-select"]', '6')
    ]);
    
    // Both click confirm simultaneously
    await Promise.all([
      user1Page.click('[data-testid="confirm-claim-button"]'),
      user2Page.click('[data-testid="confirm-claim-button"]')
    ]);
    
    // One should succeed, one should get error
    const user1Success = await user1Page.locator('text=Successfully claimed').isVisible();
    const user2Success = await user2Page.locator('text=Successfully claimed').isVisible();
    const user1Error = await user1Page.locator('text=Not enough squares available').isVisible();
    const user2Error = await user2Page.locator('text=Not enough squares available').isVisible();
    
    // Exactly one should succeed
    expect(user1Success || user2Success).toBe(true);
    expect(user1Success && user2Success).toBe(false);
    expect(user1Error || user2Error).toBe(true);
  });
});