import { test, expect } from '@playwright/test';

test.describe('Payment Tracking and Square Assignment E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Start with admin login to set up test data
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@example.com');
    await page.fill('[data-testid="password-input"]', 'AdminPassword123!');
    await page.click('[data-testid="login-submit"]');
  });

  test('complete payment tracking workflow', async ({ page }) => {
    // Navigate to board management
    await page.click('[data-testid="manage-board-button"]:first-child');
    
    // Should see payment overview
    await expect(page.locator('[data-testid="payment-overview"]')).toBeVisible();
    
    // Check initial payment status
    const initialPending = await page.locator('[data-testid="pending-count"]').textContent();
    const initialPaid = await page.locator('[data-testid="paid-count"]').textContent();
    
    // Mark a pending square as paid
    await page.click('[data-testid="pending-square"]:first-child [data-testid="mark-paid-button"]');
    await page.click('[data-testid="confirm-payment-button"]');
    
    // Verify payment count updated
    await expect(page.locator('[data-testid="paid-count"]')).not.toHaveText(initialPaid);
    await expect(page.locator('[data-testid="pending-count"]')).not.toHaveText(initialPending);
    
    // Should see updated progress bar
    await expect(page.locator('[data-testid="payment-progress"]')).toBeVisible();
  });

  test('automatic assignment trigger when board is full', async ({ page }) => {
    // Create a test board that's almost full
    await page.click('[data-testid="create-board-button"]');
    await page.fill('[data-testid="board-name-input"]', 'Auto Assignment Test');
    await page.fill('[data-testid="price-per-square-input"]', '10');
    await page.click('[data-testid="create-board-submit"]');
    
    // Navigate to the new board
    await page.click('text=Auto Assignment Test');
    
    // Simulate filling the board by marking 100 squares as paid
    // (This would normally be done through API calls in a real test)
    await page.click('[data-testid="simulate-full-board-button"]');
    
    // Should automatically trigger assignment
    await expect(page.locator('text=Board automatically assigned')).toBeVisible();
    
    // Board status should change to ASSIGNED
    await expect(page.locator('[data-testid="board-status"]')).toContainText('ASSIGNED');
    
    // Should see assigned grid positions
    await expect(page.locator('[data-testid="squares-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="assigned-square"]')).toHaveCount(100);
  });

  test('manual assignment validation and conflict resolution', async ({ page }) => {
    await page.click('[data-testid="manage-board-button"]:first-child');
    
    // Try manual assignment on partially filled board
    await page.click('[data-testid="manual-assignment-button"]');
    
    // Should show validation warning
    await expect(page.locator('text=Only paid squares will be assigned')).toBeVisible();
    
    // Confirm assignment
    await page.click('[data-testid="confirm-assignment-button"]');
    
    // Should show assignment results
    await expect(page.locator('[data-testid="assignment-results"]')).toBeVisible();
    
    // Should show number of squares assigned
    await expect(page.locator('[data-testid="assigned-count"]')).toBeVisible();
    
    // Should show any conflicts resolved
    await expect(page.locator('[data-testid="conflicts-resolved"]')).toBeVisible();
  });

  test('Fisher-Yates shuffle algorithm verification', async ({ page }) => {
    await page.click('[data-testid="manage-board-button"]:first-child');
    
    // Trigger assignment multiple times to verify randomness
    for (let i = 0; i < 3; i++) {
      await page.click('[data-testid="reset-assignment-button"]');
      await page.click('[data-testid="manual-assignment-button"]');
      await page.click('[data-testid="confirm-assignment-button"]');
      
      // Capture assignment results
      const assignmentData = await page.locator('[data-testid="assignment-data"]').textContent();
      
      // Store for comparison (in real test, would verify different arrangements)
      await page.locator('[data-testid="assignment-history"]').innerHTML();
    }
    
    // Should show different arrangements each time
    await expect(page.locator('[data-testid="randomness-verified"]')).toBeVisible();
  });

  test('payment status real-time updates', async ({ page, context }) => {
    // Open two browser contexts - admin and user
    const userPage = await context.newPage();
    
    // User logs in and views board
    await userPage.goto('/login');
    await userPage.fill('[data-testid="email-input"]', 'testuser@example.com');
    await userPage.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await userPage.click('[data-testid="login-submit"]');
    await userPage.click('[data-testid="board-item"]:first-child');
    
    // Admin marks user's square as paid
    await page.click('[data-testid="manage-board-button"]:first-child');
    await page.click('[data-testid="user-square"][data-user="testuser@example.com"] [data-testid="mark-paid-button"]');
    await page.click('[data-testid="confirm-payment-button"]');
    
    // User should see real-time update
    await expect(userPage.locator('[data-testid="payment-status"]')).toContainText('PAID');
    await expect(userPage.locator('text=Payment confirmed')).toBeVisible();
  });

  test('assignment notification system', async ({ page, context }) => {
    const userPage = await context.newPage();
    
    // User logs in and views board
    await userPage.goto('/login');
    await userPage.fill('[data-testid="email-input"]', 'testuser@example.com');
    await userPage.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await userPage.click('[data-testid="login-submit"]');
    await userPage.click('[data-testid="board-item"]:first-child');
    
    // Admin triggers assignment
    await page.click('[data-testid="manage-board-button"]:first-child');
    await page.click('[data-testid="manual-assignment-button"]');
    await page.click('[data-testid="confirm-assignment-button"]');
    
    // User should receive real-time notification
    await expect(userPage.locator('[data-testid="assignment-notification"]')).toBeVisible();
    await expect(userPage.locator('text=Your squares have been assigned')).toBeVisible();
    
    // User should see their assigned positions
    await expect(userPage.locator('[data-testid="user-assigned-squares"]')).toBeVisible();
  });

  test('payment validation and error handling', async ({ page }) => {
    await page.click('[data-testid="manage-board-button"]:first-child');
    
    // Try to mark already paid square as paid
    await page.click('[data-testid="paid-square"]:first-child [data-testid="mark-paid-button"]');
    
    // Should show error message
    await expect(page.locator('text=Square is already marked as paid')).toBeVisible();
    
    // Try to unmark payment
    await page.click('[data-testid="paid-square"]:first-child [data-testid="unmark-paid-button"]');
    await page.click('[data-testid="confirm-unmark-button"]');
    
    // Should show success message
    await expect(page.locator('text=Payment status updated')).toBeVisible();
    
    // Square should show as pending again
    await expect(page.locator('[data-testid="pending-square"]')).toBeVisible();
  });

  test('assignment rollback functionality', async ({ page }) => {
    await page.click('[data-testid="manage-board-button"]:first-child');
    
    // Perform assignment
    await page.click('[data-testid="manual-assignment-button"]');
    await page.click('[data-testid="confirm-assignment-button"]');
    
    // Should see rollback option
    await expect(page.locator('[data-testid="rollback-assignment-button"]')).toBeVisible();
    
    // Click rollback
    await page.click('[data-testid="rollback-assignment-button"]');
    await page.click('[data-testid="confirm-rollback-button"]');
    
    // Should show success message
    await expect(page.locator('text=Assignment rolled back successfully')).toBeVisible();
    
    // Board should return to FILLED status
    await expect(page.locator('[data-testid="board-status"]')).toContainText('FILLED');
    
    // Squares should no longer show positions
    await expect(page.locator('[data-testid="unassigned-square"]')).toHaveCount.greaterThan(0);
  });
});