import { test, expect } from '@playwright/test';

test.describe('Admin Board Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@example.com');
    await page.fill('[data-testid="password-input"]', 'AdminPassword123!');
    await page.click('[data-testid="login-submit"]');
    
    // Should redirect to admin dashboard
    await expect(page).toHaveURL('/admin');
  });

  test('admin can create new board', async ({ page }) => {
    // Click create board button
    await page.click('[data-testid="create-board-button"]');
    
    // Fill board creation form
    await page.fill('[data-testid="board-name-input"]', 'March Madness 2024');
    await page.fill('[data-testid="price-per-square-input"]', '25');
    
    // Set payout structure
    await page.fill('[data-testid="round1-payout"]', '25');
    await page.fill('[data-testid="round2-payout"]', '50');
    await page.fill('[data-testid="sweet16-payout"]', '100');
    await page.fill('[data-testid="elite8-payout"]', '200');
    await page.fill('[data-testid="final4-payout"]', '400');
    await page.fill('[data-testid="championship-payout"]', '800');
    
    // Submit form
    await page.click('[data-testid="create-board-submit"]');
    
    // Should show success message
    await expect(page.locator('text=Board created successfully')).toBeVisible();
    
    // Should see new board in list
    await expect(page.locator('text=March Madness 2024')).toBeVisible();
  });

  test('admin can view board management interface', async ({ page }) => {
    // Click on a board to manage
    await page.click('[data-testid="manage-board-button"]:first-child');
    
    // Should see board management interface
    await expect(page.locator('[data-testid="board-management-panel"]')).toBeVisible();
    
    // Should see participant list
    await expect(page.locator('[data-testid="participants-list"]')).toBeVisible();
    
    // Should see payment status overview
    await expect(page.locator('[data-testid="payment-overview"]')).toBeVisible();
    
    // Should see assignment controls
    await expect(page.locator('[data-testid="assignment-controls"]')).toBeVisible();
  });

  test('admin can mark squares as paid', async ({ page }) => {
    await page.click('[data-testid="manage-board-button"]:first-child');
    
    // Find a pending square and mark as paid
    await page.click('[data-testid="pending-square"]:first-child [data-testid="mark-paid-button"]');
    
    // Should show confirmation dialog
    await expect(page.locator('[data-testid="confirm-payment-dialog"]')).toBeVisible();
    
    // Confirm payment
    await page.click('[data-testid="confirm-payment-button"]');
    
    // Should show success message
    await expect(page.locator('text=Square marked as paid')).toBeVisible();
    
    // Square should now show as paid
    await expect(page.locator('[data-testid="paid-square"]')).toBeVisible();
  });

  test('admin can trigger manual square assignment', async ({ page }) => {
    await page.click('[data-testid="manage-board-button"]:first-child');
    
    // Click manual assignment button
    await page.click('[data-testid="manual-assignment-button"]');
    
    // Should show confirmation dialog
    await expect(page.locator('[data-testid="assignment-confirmation-dialog"]')).toBeVisible();
    await expect(page.locator('text=This will randomly assign all paid squares')).toBeVisible();
    
    // Confirm assignment
    await page.click('[data-testid="confirm-assignment-button"]');
    
    // Should show success message
    await expect(page.locator('text=Squares assigned successfully')).toBeVisible();
    
    // Board status should change to assigned
    await expect(page.locator('[data-testid="board-status"]')).toContainText('ASSIGNED');
  });

  test('admin can view payment tracking overview', async ({ page }) => {
    await page.click('[data-testid="manage-board-button"]:first-child');
    
    // Should see payment statistics
    await expect(page.locator('[data-testid="total-squares"]')).toBeVisible();
    await expect(page.locator('[data-testid="paid-squares"]')).toBeVisible();
    await expect(page.locator('[data-testid="pending-squares"]')).toBeVisible();
    await expect(page.locator('[data-testid="revenue-total"]')).toBeVisible();
    
    // Should see progress bar
    await expect(page.locator('[data-testid="payment-progress"]')).toBeVisible();
  });

  test('admin can manage user accounts', async ({ page }) => {
    // Navigate to user management
    await page.click('[data-testid="user-management-tab"]');
    
    // Should see user list
    await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
    
    // Should see user details
    await expect(page.locator('[data-testid="user-row"]')).toHaveCount.greaterThan(0);
    
    // Can view user's square claims
    await page.click('[data-testid="view-user-squares"]:first-child');
    await expect(page.locator('[data-testid="user-squares-modal"]')).toBeVisible();
  });

  test('admin can update game scores', async ({ page }) => {
    // Navigate to scoring section
    await page.click('[data-testid="scoring-tab"]');
    
    // Should see games list
    await expect(page.locator('[data-testid="games-table"]')).toBeVisible();
    
    // Click to update a game score
    await page.click('[data-testid="update-score-button"]:first-child');
    
    // Fill score form
    await page.fill('[data-testid="team1-score"]', '78');
    await page.fill('[data-testid="team2-score"]', '74');
    
    // Submit score update
    await page.click('[data-testid="update-score-submit"]');
    
    // Should show success message
    await expect(page.locator('text=Score updated successfully')).toBeVisible();
    
    // Should see updated score in table
    await expect(page.locator('text=78-74')).toBeVisible();
  });

  test('admin can view board analytics', async ({ page }) => {
    await page.click('[data-testid="manage-board-button"]:first-child');
    
    // Navigate to analytics tab
    await page.click('[data-testid="analytics-tab"]');
    
    // Should see participation metrics
    await expect(page.locator('[data-testid="participation-chart"]')).toBeVisible();
    
    // Should see revenue breakdown
    await expect(page.locator('[data-testid="revenue-breakdown"]')).toBeVisible();
    
    // Should see user engagement stats
    await expect(page.locator('[data-testid="engagement-stats"]')).toBeVisible();
  });

  test('admin cannot delete board with participants', async ({ page }) => {
    await page.click('[data-testid="manage-board-button"]:first-child');
    
    // Try to delete board
    await page.click('[data-testid="delete-board-button"]');
    
    // Should show warning dialog
    await expect(page.locator('[data-testid="delete-warning-dialog"]')).toBeVisible();
    await expect(page.locator('text=Cannot delete board with participants')).toBeVisible();
    
    // Delete button should be disabled
    await expect(page.locator('[data-testid="confirm-delete-button"]')).toBeDisabled();
  });
});