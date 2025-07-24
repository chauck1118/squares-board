import { test, expect } from '@playwright/test';

test.describe('AWS Amplify User Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test.describe('Authentication Flow', () => {
    test('should complete user registration and login flow', async ({ page }) => {
      // Navigate to registration
      await page.click('[data-testid="register-link"]');
      await expect(page).toHaveURL('/register');

      // Fill registration form
      await page.fill('[data-testid="display-name-input"]', 'Test User');
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!');

      // Submit registration
      await page.click('[data-testid="register-button"]');

      // Should redirect to login after successful registration
      await expect(page).toHaveURL('/login');
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Registration successful');

      // Login with new credentials
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-button"]');

      // Should redirect to dashboard after successful login
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-testid="user-display-name"]')).toContainText('Test User');
    });

    test('should handle authentication errors gracefully', async ({ page }) => {
      // Navigate to login
      await page.goto('/login');

      // Try to login with invalid credentials
      await page.fill('[data-testid="email-input"]', 'invalid@example.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');

      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
      await expect(page).toHaveURL('/login');
    });

    test('should protect authenticated routes', async ({ page }) => {
      // Try to access protected route without authentication
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL('/login');
      await expect(page.locator('[data-testid="auth-required-message"]')).toContainText('Please log in to continue');
    });
  });

  test.describe('Board Management Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin user
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'admin@example.com');
      await page.fill('[data-testid="password-input"]', 'AdminPassword123!');
      await page.click('[data-testid="login-button"]');
      await expect(page).toHaveURL('/dashboard');
    });

    test('should create a new board successfully', async ({ page }) => {
      // Navigate to admin dashboard
      await page.click('[data-testid="admin-dashboard-link"]');
      await expect(page).toHaveURL('/admin');

      // Click create board button
      await page.click('[data-testid="create-board-button"]');

      // Fill board creation form
      await page.fill('[data-testid="board-name-input"]', 'March Madness 2024');
      await page.fill('[data-testid="price-per-square-input"]', '10');

      // Set payout structure
      await page.fill('[data-testid="round1-payout-input"]', '25');
      await page.fill('[data-testid="round2-payout-input"]', '50');
      await page.fill('[data-testid="sweet16-payout-input"]', '100');
      await page.fill('[data-testid="elite8-payout-input"]', '200');
      await page.fill('[data-testid="final4-payout-input"]', '350');
      await page.fill('[data-testid="championship-payout-input"]', '500');

      // Submit form
      await page.click('[data-testid="create-board-submit"]');

      // Should show success message and redirect
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Board created successfully');
      
      // Verify board appears in list
      await expect(page.locator('[data-testid="board-list"]')).toContainText('March Madness 2024');
      await expect(page.locator('[data-testid="board-status"]')).toContainText('OPEN');
    });

    test('should display board list with real-time updates', async ({ page }) => {
      // Navigate to dashboard
      await page.goto('/dashboard');

      // Should show existing boards
      await expect(page.locator('[data-testid="board-list"]')).toBeVisible();
      
      // Check for board information
      const boardCard = page.locator('[data-testid="board-card"]').first();
      await expect(boardCard.locator('[data-testid="board-name"]')).toBeVisible();
      await expect(boardCard.locator('[data-testid="board-status"]')).toBeVisible();
      await expect(boardCard.locator('[data-testid="claimed-squares"]')).toBeVisible();
      await expect(boardCard.locator('[data-testid="total-squares"]')).toContainText('100');
    });
  });

  test.describe('Square Claiming Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Login as regular user
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'UserPassword123!');
      await page.click('[data-testid="login-button"]');
      await expect(page).toHaveURL('/dashboard');
    });

    test('should claim squares on a board', async ({ page }) => {
      // Click on an open board
      await page.click('[data-testid="board-card"]');
      await expect(page).toHaveURL(/\/board\/.+/);

      // Should show squares grid
      await expect(page.locator('[data-testid="squares-grid"]')).toBeVisible();

      // Click claim squares button
      await page.click('[data-testid="claim-squares-button"]');

      // Select number of squares (max 10)
      await page.selectOption('[data-testid="squares-count-select"]', '5');

      // Confirm claim
      await page.click('[data-testid="confirm-claim-button"]');

      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Squares claimed successfully');

      // Should show pending payment status
      await expect(page.locator('[data-testid="payment-status"]')).toContainText('PENDING');
      
      // Should update claimed squares count
      await expect(page.locator('[data-testid="claimed-squares-count"]')).toContainText('5');
    });

    test('should enforce 10 square limit per user', async ({ page }) => {
      // Navigate to board
      await page.click('[data-testid="board-card"]');

      // Try to claim more than 10 squares
      await page.click('[data-testid="claim-squares-button"]');
      await page.selectOption('[data-testid="squares-count-select"]', '15');

      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Maximum 10 squares per user');
      
      // Confirm button should be disabled
      await expect(page.locator('[data-testid="confirm-claim-button"]')).toBeDisabled();
    });

    test('should prevent claiming on filled boards', async ({ page }) => {
      // Navigate to a filled board
      await page.click('[data-testid="board-card"][data-status="FILLED"]');

      // Claim button should be disabled
      await expect(page.locator('[data-testid="claim-squares-button"]')).toBeDisabled();
      
      // Should show board filled message
      await expect(page.locator('[data-testid="board-status-message"]')).toContainText('Board is full');
    });
  });

  test.describe('Real-time Updates Flow', () => {
    test('should show real-time square claims', async ({ page, context }) => {
      // Open two browser contexts to simulate multiple users
      const page2 = await context.newPage();

      // Login both users
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'user1@example.com');
      await page.fill('[data-testid="password-input"]', 'Password123!');
      await page.click('[data-testid="login-button"]');

      await page2.goto('/login');
      await page2.fill('[data-testid="email-input"]', 'user2@example.com');
      await page2.fill('[data-testid="password-input"]', 'Password123!');
      await page2.click('[data-testid="login-button"]');

      // Both navigate to same board
      await page.click('[data-testid="board-card"]');
      await page2.click('[data-testid="board-card"]');

      // User 1 claims squares
      await page.click('[data-testid="claim-squares-button"]');
      await page.selectOption('[data-testid="squares-count-select"]', '3');
      await page.click('[data-testid="confirm-claim-button"]');

      // User 2 should see updated claimed count in real-time
      await expect(page2.locator('[data-testid="claimed-squares-count"]')).toContainText('3');
      await expect(page2.locator('[data-testid="board-status"]')).toContainText('OPEN');

      await page2.close();
    });

    test('should show real-time score updates', async ({ page }) => {
      // Login as user
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'Password123!');
      await page.click('[data-testid="login-button"]');

      // Navigate to active board
      await page.click('[data-testid="board-card"][data-status="ACTIVE"]');

      // Should show scoring table
      await expect(page.locator('[data-testid="scoring-table"]')).toBeVisible();

      // Should show games with scores
      await expect(page.locator('[data-testid="game-row"]')).toHaveCount.greaterThan(0);
      
      // Check for real-time score updates (simulated)
      const gameRow = page.locator('[data-testid="game-row"]').first();
      await expect(gameRow.locator('[data-testid="team1-score"]')).toBeVisible();
      await expect(gameRow.locator('[data-testid="team2-score"]')).toBeVisible();
      await expect(gameRow.locator('[data-testid="game-status"]')).toBeVisible();
    });
  });

  test.describe('Admin Workflows', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'admin@example.com');
      await page.fill('[data-testid="password-input"]', 'AdminPassword123!');
      await page.click('[data-testid="login-button"]');
      await page.goto('/admin');
    });

    test('should manage payment status', async ({ page }) => {
      // Navigate to board management
      await page.click('[data-testid="manage-board-button"]');

      // Should show squares with payment status
      await expect(page.locator('[data-testid="squares-management"]')).toBeVisible();

      // Mark square as paid
      const pendingSquare = page.locator('[data-testid="square-row"][data-status="PENDING"]').first();
      await pendingSquare.locator('[data-testid="mark-paid-button"]').click();

      // Should update status
      await expect(pendingSquare.locator('[data-testid="payment-status"]')).toContainText('PAID');
      
      // Should update board paid squares count
      await expect(page.locator('[data-testid="paid-squares-count"]')).toContainText(/\d+/);
    });

    test('should trigger random assignment when board is full', async ({ page }) => {
      // Navigate to filled board
      await page.click('[data-testid="board-card"][data-status="FILLED"]');

      // Should show assignment trigger button
      await expect(page.locator('[data-testid="trigger-assignment-button"]')).toBeVisible();

      // Trigger assignment
      await page.click('[data-testid="trigger-assignment-button"]');

      // Should show confirmation dialog
      await expect(page.locator('[data-testid="assignment-confirmation"]')).toBeVisible();
      await page.click('[data-testid="confirm-assignment-button"]');

      // Should update board status to ASSIGNED
      await expect(page.locator('[data-testid="board-status"]')).toContainText('ASSIGNED');
      
      // Should show assigned grid positions
      await expect(page.locator('[data-testid="squares-grid"]')).toBeVisible();
      await expect(page.locator('[data-testid="assigned-square"]')).toHaveCount(100);
    });

    test('should update game scores', async ({ page }) => {
      // Navigate to active board
      await page.click('[data-testid="board-card"][data-status="ACTIVE"]');

      // Click on game to update score
      await page.click('[data-testid="game-row"]');

      // Should show score update form
      await expect(page.locator('[data-testid="score-update-form"]')).toBeVisible();

      // Update scores
      await page.fill('[data-testid="team1-score-input"]', '78');
      await page.fill('[data-testid="team2-score-input"]', '74');
      await page.selectOption('[data-testid="game-status-select"]', 'COMPLETED');

      // Submit update
      await page.click('[data-testid="update-score-button"]');

      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Score updated successfully');

      // Should determine winner
      await expect(page.locator('[data-testid="winner-announcement"]')).toBeVisible();
      await expect(page.locator('[data-testid="winning-square"]')).toContainText(/Square \d+/);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/*', route => route.abort());

      await page.goto('/');

      // Should show network error message
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('should handle GraphQL errors', async ({ page }) => {
      // Mock GraphQL error response
      await page.route('**/graphql', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: null,
            errors: [
              {
                message: 'Unauthorized access',
                extensions: { code: 'UNAUTHORIZED' }
              }
            ]
          })
        });
      });

      await page.goto('/dashboard');

      // Should show error message
      await expect(page.locator('[data-testid="graphql-error"]')).toContainText('Unauthorized access');
    });
  });
});