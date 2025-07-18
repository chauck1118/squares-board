import { test, expect } from '@playwright/test';

test.describe('Mobile User Experience E2E', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('mobile navigation and responsive layout', async ({ page }) => {
    // Should show mobile-optimized header
    await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
    
    // Should show hamburger menu
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Click hamburger menu
    await page.click('[data-testid="mobile-menu-button"]');
    
    // Should show mobile navigation menu
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
    
    // Should have proper touch targets
    const loginButton = page.locator('[data-testid="mobile-login-button"]');
    const boundingBox = await loginButton.boundingBox();
    expect(boundingBox?.height).toBeGreaterThan(44); // iOS minimum touch target
  });

  test('mobile registration and login flow', async ({ page }) => {
    // Navigate to registration
    await page.click('[data-testid="mobile-menu-button"]');
    await page.click('[data-testid="mobile-register-link"]');
    
    // Should show mobile-optimized form
    await expect(page.locator('[data-testid="mobile-register-form"]')).toBeVisible();
    
    // Form inputs should be properly sized for mobile
    const emailInput = page.locator('[data-testid="email-input"]');
    const inputBox = await emailInput.boundingBox();
    expect(inputBox?.height).toBeGreaterThan(44);
    
    // Fill registration form
    await page.fill('[data-testid="display-name-input"]', 'Mobile User');
    await page.fill('[data-testid="email-input"]', 'mobile@example.com');
    await page.fill('[data-testid="password-input"]', 'MobilePassword123!');
    
    // Submit should work with touch
    await page.tap('[data-testid="register-submit"]');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
    
    // Login form should be mobile-optimized
    await expect(page.locator('[data-testid="mobile-login-form"]')).toBeVisible();
    
    // Login with touch interactions
    await page.fill('[data-testid="email-input"]', 'mobile@example.com');
    await page.fill('[data-testid="password-input"]', 'MobilePassword123!');
    await page.tap('[data-testid="login-submit"]');
    
    // Should redirect to mobile dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="mobile-dashboard"]')).toBeVisible();
  });

  test('mobile squares grid interaction', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'mobile@example.com');
    await page.fill('[data-testid="password-input"]', 'MobilePassword123!');
    await page.tap('[data-testid="login-submit"]');
    
    // Navigate to board
    await page.tap('[data-testid="board-item"]:first-child');
    
    // Should show mobile-optimized grid
    await expect(page.locator('[data-testid="mobile-squares-grid"]')).toBeVisible();
    
    // Grid should be scrollable horizontally if needed
    const grid = page.locator('[data-testid="mobile-squares-grid"]');
    await expect(grid).toHaveCSS('overflow-x', 'auto');
    
    // Individual squares should be touch-friendly
    const square = page.locator('[data-testid="grid-square"]').first();
    const squareBox = await square.boundingBox();
    expect(squareBox?.width).toBeGreaterThan(30);
    expect(squareBox?.height).toBeGreaterThan(30);
    
    // Should support pinch-to-zoom
    await page.touchscreen.tap(200, 300);
    await page.mouse.wheel(0, -100); // Simulate zoom
    
    // Grid should remain usable after zoom
    await expect(page.locator('[data-testid="mobile-squares-grid"]')).toBeVisible();
  });

  test('mobile square claiming workflow', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'mobile@example.com');
    await page.fill('[data-testid="password-input"]', 'MobilePassword123!');
    await page.tap('[data-testid="login-submit"]');
    
    await page.tap('[data-testid="board-item"]:first-child');
    
    // Claim squares button should be mobile-friendly
    await page.tap('[data-testid="claim-squares-button"]');
    
    // Should show mobile-optimized modal
    await expect(page.locator('[data-testid="mobile-claim-modal"]')).toBeVisible();
    
    // Select dropdown should work with touch
    await page.tap('[data-testid="squares-count-select"]');
    await page.tap('option[value="3"]');
    
    // Confirm button should be properly sized
    const confirmButton = page.locator('[data-testid="confirm-claim-button"]');
    const buttonBox = await confirmButton.boundingBox();
    expect(buttonBox?.height).toBeGreaterThan(44);
    
    await page.tap('[data-testid="confirm-claim-button"]');
    
    // Should show mobile success message
    await expect(page.locator('[data-testid="mobile-success-message"]')).toBeVisible();
  });

  test('mobile scoring table and results', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'mobile@example.com');
    await page.fill('[data-testid="password-input"]', 'MobilePassword123!');
    await page.tap('[data-testid="login-submit"]');
    
    await page.tap('[data-testid="board-item"]:first-child');
    
    // Should show mobile-optimized scoring table
    await expect(page.locator('[data-testid="mobile-scoring-table"]')).toBeVisible();
    
    // Table should be horizontally scrollable
    const table = page.locator('[data-testid="mobile-scoring-table"]');
    await expect(table).toHaveCSS('overflow-x', 'auto');
    
    // Should support swipe gestures
    await page.touchscreen.tap(200, 400);
    await page.mouse.move(200, 400);
    await page.mouse.down();
    await page.mouse.move(100, 400);
    await page.mouse.up();
    
    // Table should scroll horizontally
    const scrollLeft = await table.evaluate(el => el.scrollLeft);
    expect(scrollLeft).toBeGreaterThan(0);
  });

  test('mobile admin dashboard functionality', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@example.com');
    await page.fill('[data-testid="password-input"]', 'AdminPassword123!');
    await page.tap('[data-testid="login-submit"]');
    
    // Should show mobile admin dashboard
    await expect(page.locator('[data-testid="mobile-admin-dashboard"]')).toBeVisible();
    
    // Should have collapsible sections for mobile
    await page.tap('[data-testid="boards-section-header"]');
    await expect(page.locator('[data-testid="boards-section-content"]')).toBeVisible();
    
    // Board management should be touch-friendly
    await page.tap('[data-testid="manage-board-button"]:first-child');
    
    // Should show mobile board management interface
    await expect(page.locator('[data-testid="mobile-board-management"]')).toBeVisible();
    
    // Payment buttons should be properly sized
    const paymentButton = page.locator('[data-testid="mark-paid-button"]').first();
    const paymentBox = await paymentButton.boundingBox();
    expect(paymentBox?.height).toBeGreaterThan(44);
  });

  test('mobile real-time notifications', async ({ page, context }) => {
    // User page
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'mobile@example.com');
    await page.fill('[data-testid="password-input"]', 'MobilePassword123!');
    await page.tap('[data-testid="login-submit"]');
    await page.tap('[data-testid="board-item"]:first-child');
    
    // Admin page
    const adminPage = await context.newPage();
    await adminPage.setViewportSize({ width: 375, height: 667 });
    await adminPage.goto('/login');
    await adminPage.fill('[data-testid="email-input"]', 'admin@example.com');
    await adminPage.fill('[data-testid="password-input"]', 'AdminPassword123!');
    await adminPage.tap('[data-testid="login-submit"]');
    
    // Admin updates score
    await adminPage.tap('[data-testid="scoring-tab"]');
    await adminPage.tap('[data-testid="update-score-button"]:first-child');
    await adminPage.fill('[data-testid="team1-score"]', '78');
    await adminPage.fill('[data-testid="team2-score"]', '74');
    await adminPage.tap('[data-testid="update-score-submit"]');
    
    // User should see mobile notification
    await expect(page.locator('[data-testid="mobile-notification"]')).toBeVisible();
    
    // Notification should be properly positioned for mobile
    const notification = page.locator('[data-testid="mobile-notification"]');
    const notificationBox = await notification.boundingBox();
    expect(notificationBox?.top).toBeLessThan(100); // Should be near top of screen
  });

  test('mobile form validation and error handling', async ({ page }) => {
    await page.goto('/register');
    
    // Submit empty form
    await page.tap('[data-testid="register-submit"]');
    
    // Should show mobile-optimized error messages
    await expect(page.locator('[data-testid="mobile-error-message"]')).toBeVisible();
    
    // Error messages should be properly positioned
    const errorMessage = page.locator('[data-testid="mobile-error-message"]');
    const errorBox = await errorMessage.boundingBox();
    expect(errorBox?.width).toBeLessThan(375); // Should fit in mobile viewport
    
    // Should not overlap with virtual keyboard
    await page.fill('[data-testid="email-input"]', 'test');
    const inputBox = await page.locator('[data-testid="email-input"]').boundingBox();
    expect(inputBox?.bottom).toBeLessThan(400); // Should be above keyboard area
  });

  test('mobile accessibility and touch targets', async ({ page }) => {
    await page.goto('/');
    
    // All interactive elements should meet minimum touch target size
    const interactiveElements = await page.locator('button, a, input, select').all();
    
    for (const element of interactiveElements) {
      const box = await element.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThan(44);
        expect(box.height).toBeGreaterThan(44);
      }
    }
    
    // Should support screen reader navigation
    await expect(page.locator('[aria-label]')).toHaveCount.greaterThan(0);
    
    // Should have proper heading hierarchy
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('mobile performance and loading states', async ({ page }) => {
    // Should show mobile loading spinner
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="mobile-loading-spinner"]')).toBeVisible();
    
    // Loading spinner should be appropriately sized for mobile
    const spinner = page.locator('[data-testid="mobile-loading-spinner"]');
    const spinnerBox = await spinner.boundingBox();
    expect(spinnerBox?.width).toBeLessThan(100);
    expect(spinnerBox?.height).toBeLessThan(100);
    
    // Should handle slow network gracefully
    await page.route('**/api/**', route => {
      setTimeout(() => route.continue(), 2000); // Simulate slow network
    });
    
    await page.reload();
    
    // Should show loading state during slow requests
    await expect(page.locator('[data-testid="mobile-loading-state"]')).toBeVisible();
  });
});