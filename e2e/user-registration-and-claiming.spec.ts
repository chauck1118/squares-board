import { test, expect } from '@playwright/test';

test.describe('User Registration and Square Claiming E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('complete user registration flow', async ({ page }) => {
    // Navigate to registration page
    await page.click('text=Register');
    
    // Fill registration form
    await page.fill('[data-testid="display-name-input"]', 'Test User');
    await page.fill('[data-testid="email-input"]', 'testuser@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    
    // Submit registration
    await page.click('[data-testid="register-submit"]');
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login');
    await expect(page.locator('text=Registration successful')).toBeVisible();
  });

  test('user login flow', async ({ page }) => {
    // Navigate to login page
    await page.click('text=Login');
    
    // Fill login form with valid credentials
    await page.fill('[data-testid="email-input"]', 'testuser@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    
    // Submit login
    await page.click('[data-testid="login-submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome, Test User')).toBeVisible();
  });

  test('invalid login shows error', async ({ page }) => {
    await page.click('text=Login');
    
    // Fill login form with invalid credentials
    await page.fill('[data-testid="email-input"]', 'invalid@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    
    await page.click('[data-testid="login-submit"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('complete square claiming workflow', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'testuser@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.click('[data-testid="login-submit"]');
    
    // Navigate to boards
    await expect(page).toHaveURL('/dashboard');
    
    // Click on an available board
    await page.click('[data-testid="board-item"]:first-child');
    
    // Should be on board detail page
    await expect(page.locator('[data-testid="board-detail"]')).toBeVisible();
    
    // Click claim squares button
    await page.click('[data-testid="claim-squares-button"]');
    
    // Select number of squares (between 1-10)
    await page.selectOption('[data-testid="squares-count-select"]', '5');
    
    // Confirm square claiming
    await page.click('[data-testid="confirm-claim-button"]');
    
    // Should show success message
    await expect(page.locator('text=Successfully claimed 5 squares')).toBeVisible();
    
    // Should show pending payment status
    await expect(page.locator('text=Payment Pending')).toBeVisible();
  });

  test('square claiming validation - maximum 10 squares', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'testuser@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.click('[data-testid="login-submit"]');
    
    await page.click('[data-testid="board-item"]:first-child');
    await page.click('[data-testid="claim-squares-button"]');
    
    // Try to select more than 10 squares
    await page.selectOption('[data-testid="squares-count-select"]', '15');
    
    // Should show validation error
    await expect(page.locator('text=Maximum 10 squares allowed')).toBeVisible();
    
    // Confirm button should be disabled
    await expect(page.locator('[data-testid="confirm-claim-button"]')).toBeDisabled();
  });

  test('cannot claim squares on filled board', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'testuser@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.click('[data-testid="login-submit"]');
    
    // Navigate to a filled board
    await page.click('[data-testid="board-item"][data-status="filled"]');
    
    // Claim squares button should not be visible or should be disabled
    await expect(page.locator('[data-testid="claim-squares-button"]')).not.toBeVisible();
    await expect(page.locator('text=Board is full')).toBeVisible();
  });

  test('user can view their claimed squares', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'testuser@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.click('[data-testid="login-submit"]');
    
    // Navigate to board with claimed squares
    await page.click('[data-testid="board-item"]:first-child');
    
    // Should see user's squares highlighted
    await expect(page.locator('[data-testid="user-square"]')).toHaveCount(5);
    
    // Should show square count
    await expect(page.locator('text=Your squares: 5')).toBeVisible();
  });

  test('logout functionality', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'testuser@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.click('[data-testid="login-submit"]');
    
    // Click logout
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to home page
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Login')).toBeVisible();
  });
});